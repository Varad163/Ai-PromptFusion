"use client"
import { Progress } from '@/components/ui/progress'
import React from 'react'

function UsageCreditProgress() {
  return (
    <div className='p-3 border rounded-2xl mb-5 flex flex-col gap-2'><h2>Free Plan</h2>
    <p className='font-bold text-gray-400'>0/5 message used</p>
    <Progress value={33}/>
    </div>
  )
}

export default UsageCreditProgress