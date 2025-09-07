import { HashRouter, Navigate, Route, Routes } from 'react-router'
import Menu from './components/layout/menu'
import Title from './components/layout/title'
import ConsolePage from './components/page/console'
import SettingPage from './components/page/setting'

function App() {
  return <main className='flex flex-col h-full'>
    <div className=' main flex-1 flex overflow-hidden bg-base-200'>
      <HashRouter>
        <Menu />
        <Routes>
          <Route path="/" element={<Navigate to="/console" />} />
          <Route path='/console' element={<ConsolePage />} />
          <Route path='/setting' element={<SettingPage />} />
        </Routes>
      </HashRouter>
    </div>
  </main>
}

export default App
