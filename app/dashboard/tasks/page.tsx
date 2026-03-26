'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, FamilyMember } from '@/lib/types'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  ListTodo,
} from 'lucide-react'
import { isToday as checkToday, isPast, parseISO, startOfDay } from 'date-fns'
import { isOverdue } from '@/lib/utils'

export default function TasksPage() {
  const supabase = createClient()

  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [familyTasks, setFamilyTasks] = useState<Task[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('my-tasks')

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [myRes, familyRes, membersRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_family_task', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('*')
          .eq('is_family_task', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('family_members')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      if (myRes.error) throw myRes.error
      if (familyRes.error) throw familyRes.error
      if (membersRes.error) throw membersRes.error

      setMyTasks(myRes.data ?? [])
      setFamilyTasks(familyRes.data ?? [])
      setFamilyMembers(membersRes.data ?? [])

      // Check if user is admin
      const currentMember = (membersRes.data ?? []).find(
        (m: FamilyMember) => m.user_id === user.id
      )
      setIsAdmin(currentMember?.role === 'admin')
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stats
  const allUserTasks = [...myTasks, ...familyTasks]
  const totalCount = allUserTasks.length
  const overdueCount = allUserTasks.filter(
    (t) => t.due_date && t.status !== 'done' && isOverdue(t.due_date)
  ).length
  const dueTodayCount = allUserTasks.filter(
    (t) =>
      t.due_date &&
      t.status !== 'done' &&
      checkToday(parseISO(t.due_date))
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm">Loading tasks…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
            <p className="text-xs text-gray-500">Manage your personal and family tasks</p>
          </div>
        </div>
        <Button
          onClick={() => setFabOpen(true)}
          className="hidden md:flex bg-teal-500 hover:bg-teal-600 text-white h-10 rounded-lg gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New task
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <ListTodo className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">Total tasks</p>
          </div>
        </div>
        <div
          className={
            overdueCount > 0
              ? 'bg-red-50 rounded-xl p-3 border border-red-100 shadow-sm'
              : 'bg-white rounded-xl p-3 border border-gray-100 shadow-sm'
          }
        >
          <p
            className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}
          >
            {overdueCount}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <AlertCircle className={`w-3 h-3 ${overdueCount > 0 ? 'text-red-400' : 'text-gray-400'}`} />
            <p className={`text-xs ${overdueCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>Overdue</p>
          </div>
        </div>
        <div
          className={
            dueTodayCount > 0
              ? 'bg-amber-50 rounded-xl p-3 border border-amber-100 shadow-sm'
              : 'bg-white rounded-xl p-3 border border-gray-100 shadow-sm'
          }
        >
          <p
            className={`text-2xl font-bold ${dueTodayCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}
          >
            {dueTodayCount}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className={`w-3 h-3 ${dueTodayCount > 0 ? 'text-amber-400' : 'text-gray-400'}`} />
            <p className={`text-xs ${dueTodayCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Due today</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 rounded-xl p-1 h-11">
          <TabsTrigger
            value="my-tasks"
            className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium"
          >
            My Tasks
            {myTasks.length > 0 && (
              <span className="ml-1.5 bg-teal-100 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {myTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="family-tasks"
            className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium"
          >
            Family Tasks
            {familyTasks.length > 0 && (
              <span className="ml-1.5 bg-teal-100 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {familyTasks.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="mt-4">
          <TaskList
            tasks={myTasks}
            familyMembers={familyMembers}
            onRefresh={fetchData}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="family-tasks" className="mt-4">
          <TaskList
            tasks={familyTasks}
            familyMembers={familyMembers}
            onRefresh={fetchData}
            isAdmin={isAdmin}
            showFamilyToggle
          />
        </TabsContent>
      </Tabs>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <Button
          size="icon"
          onClick={() => setFabOpen(true)}
          className="w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/30"
          aria-label="Add task"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* FAB dialog */}
      <TaskDialog
        open={fabOpen}
        onClose={(saved) => {
          setFabOpen(false)
          if (saved) fetchData()
        }}
        familyMembers={familyMembers}
        isAdmin={isAdmin}
      />
    </div>
  )
}
