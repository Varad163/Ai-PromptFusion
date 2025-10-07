import React from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
function AppHeader() {
  return (
    <div className='p-3 w-full shadow flex justify-between items-center'>
        <SidebarTrigger />
    <Button>Sign In</Button> 
    </div>
  )
}

export default AppHeader