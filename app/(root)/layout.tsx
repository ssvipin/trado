import React from 'react'
import Header from '../../components/header'
import { auth } from '../../lib/betterAuth/auth'
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
interface layoutProps {
  children: React.ReactNode
}

const layout: React.FC<layoutProps> = async ({ children }) => {
  const session = await auth?.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/sign-in');
  }
  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
  return (
    <main className='min-h-screen text-gray-400'>
      <Header user = {user}/>
      <div className='container py-10'>
        {children}
      </div>
    </main>
  )
}

export default layout