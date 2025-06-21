'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PRActivityChartProps {
  data: Array<{
    date: string
    opened: number
    merged: number
    closed: number
  }>
}

export function PRActivityChart({ data }: PRActivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pull Request Activity</CardTitle>
        <CardDescription>
          PR activity over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="opened" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Opened"
            />
            <Line 
              type="monotone" 
              dataKey="merged" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Merged"
            />
            <Line 
              type="monotone" 
              dataKey="closed" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Closed"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 