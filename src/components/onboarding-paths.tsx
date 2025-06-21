'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle, Clock, BookOpen, Target, User } from 'lucide-react'

interface LearningStep {
  id: string
  title: string
  description: string
  estimatedTime: string
  completed: boolean
  type: 'read' | 'practice' | 'explore'
  documentId?: string
}

interface LearningPath {
  id: string
  title: string
  description: string
  role: string
  experienceLevel: string
  totalSteps: number
  completedSteps: number
  estimatedTime: string
  steps: LearningStep[]
}

// Dummy learning paths data
const dummyPaths: LearningPath[] = [
  {
    id: 'junior-frontend',
    title: 'Frontend Development Basics',
    description: 'Perfect for junior developers starting with our frontend architecture',
    role: 'Frontend Developer',
    experienceLevel: 'Junior',
    totalSteps: 8,
    completedSteps: 3,
    estimatedTime: '4-6 hours',
    steps: [
      {
        id: 'step-1',
        title: 'Understanding Project Structure',
        description: 'Learn about our folder organization and file naming conventions',
        estimatedTime: '30 min',
        completed: true,
        type: 'read',
        documentId: 'frontend.structure'
      },
      {
        id: 'step-2',
        title: 'Component Architecture',
        description: 'Explore our component library and design system',
        estimatedTime: '45 min',
        completed: true,
        type: 'read',
        documentId: 'frontend.components.ui'
      },
      {
        id: 'step-3',
        title: 'Authentication Flow',
        description: 'Understand how user authentication works in the frontend',
        estimatedTime: '1 hour',
        completed: true,
        type: 'read',
        documentId: 'frontend.components.auth'
      },
      {
        id: 'step-4',
        title: 'State Management',
        description: 'Learn our approach to managing application state',
        estimatedTime: '1 hour',
        completed: false,
        type: 'read',
        documentId: 'frontend.state'
      },
      {
        id: 'step-5',
        title: 'API Integration',
        description: 'How to connect frontend components with backend APIs',
        estimatedTime: '45 min',
        completed: false,
        type: 'explore',
        documentId: 'frontend.api'
      }
    ]
  },
  {
    id: 'backend-onboarding',
    title: 'Backend Architecture Deep Dive',
    description: 'Comprehensive guide for developers working on server-side code',
    role: 'Backend Developer',
    experienceLevel: 'Intermediate',
    totalSteps: 10,
    completedSteps: 1,
    estimatedTime: '6-8 hours',
    steps: [
      {
        id: 'backend-1',
        title: 'Database Schema Overview',
        description: 'Understand our database structure and relationships',
        estimatedTime: '1 hour',
        completed: true,
        type: 'read',
        documentId: 'backend.database.schema'
      },
      {
        id: 'backend-2',
        title: 'Authentication System',
        description: 'Deep dive into JWT tokens and session management',
        estimatedTime: '1.5 hours',
        completed: false,
        type: 'read',
        documentId: 'backend.auth.overview'
      },
      {
        id: 'backend-3',
        title: 'API Design Patterns',
        description: 'Learn our REST API conventions and best practices',
        estimatedTime: '1 hour',
        completed: false,
        type: 'explore',
        documentId: 'backend.api.patterns'
      }
    ]
  }
]

export function OnboardingPaths() {
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null)
  const [activeStep, setActiveStep] = useState<LearningStep | null>(null)

  const handlePathSelect = (path: LearningPath) => {
    setSelectedPath(path)
    setActiveStep(null)
  }

  const handleStepClick = (step: LearningStep) => {
    setActiveStep(step)
  }

  const handleCompleteStep = (stepId: string) => {
    if (selectedPath) {
      const updatedSteps = selectedPath.steps.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      )
      const updatedPath = {
        ...selectedPath,
        steps: updatedSteps,
        completedSteps: updatedSteps.filter(s => s.completed).length
      }
      setSelectedPath(updatedPath)
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'read':
        return <BookOpen className="h-4 w-4" />
      case 'practice':
        return <Target className="h-4 w-4" />
      case 'explore':
        return <User className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'read':
        return 'secondary'
      case 'practice':
        return 'success'
      case 'explore':
        return 'default'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Smart Onboarding Paths</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          AI-generated personalized learning paths based on your role and experience level
        </p>
      </div>

      {!selectedPath ? (
        <div className="grid gap-4 md:grid-cols-2">
          {dummyPaths.map((path) => {
            const progress = (path.completedSteps / path.totalSteps) * 100

            return (
              <Card key={path.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{path.title}</CardTitle>
                      <CardDescription className="mt-1">{path.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{path.estimatedTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    <Badge variant="outline" size="sm">{path.role}</Badge>
                    <Badge variant="secondary" size="sm">{path.experienceLevel}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{path.completedSteps}/{path.totalSteps} steps</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="primary"
                    onClick={() => handlePathSelect(path)}
                  >
                    {path.completedSteps > 0 ? 'Continue Learning' : 'Start Path'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Path Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedPath.title}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedPath(null)}
                  >
                    ← Back
                  </Button>
                </div>
                <CardDescription>{selectedPath.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" size="sm">{selectedPath.role}</Badge>
                    <Badge variant="secondary" size="sm">{selectedPath.experienceLevel}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{selectedPath.completedSteps}/{selectedPath.totalSteps}</span>
                    </div>
                    <Progress 
                      value={(selectedPath.completedSteps / selectedPath.totalSteps) * 100} 
                      variant="success"
                    />
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Estimated time: {selectedPath.estimatedTime}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Steps List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Learning Steps</CardTitle>
                <CardDescription>Click on any step to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedPath.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        activeStep?.id === step.id 
                          ? 'bg-gray-100 dark:bg-gray-800' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                      onClick={() => handleStepClick(step)}
                    >
                      <div className="flex-shrink-0">
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{index + 1}. {step.title}</span>
                          <Badge variant={getStepTypeColor(step.type) as 'default' | 'secondary' | 'outline' | 'destructive' | 'success'} size="sm">
                            {step.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {step.estimatedTime}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step Details */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">
                  {activeStep ? 'Step Details' : 'Select a Step'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeStep ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        {getStepIcon(activeStep.type)}
                        <span className="font-medium">{activeStep.title}</span>
                      </div>
                      <Badge variant={getStepTypeColor(activeStep.type) as 'default' | 'secondary' | 'outline' | 'destructive' | 'success'} size="sm" className="mb-2">
                        {activeStep.type}
                      </Badge>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {activeStep.description}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Estimated time: {activeStep.estimatedTime}
                    </div>

                    {activeStep.documentId && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        Document: {activeStep.documentId}
                      </div>
                    )}

                    <div className="flex space-x-2 pt-4">
                      {!activeStep.completed && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleCompleteStep(activeStep.id)}
                        >
                          Mark Complete
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Documentation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select a learning step to view its details and resources.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
} 