import React from 'react'
import Header from '../../components/header'
interface layoutProps {
  children: React.ReactNode
}

const layout: React.FC<layoutProps> = ({children}) => {
  return (
    <main className='min-h-screen text-gray-400'>
      <Header />
      <div className='container py-10'>
        {children}
      </div>
    </main>
  )
}

export default layout