import './App.css'
import MenuPage from './pages/MenuPage'
import PickupTimePage from './pages/PickupTimePage'
import TicketPage from './pages/TicketPage'
import { BrowserRouter, Route, Routes } from 'react-router-dom'


function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/pickup-time" element={<PickupTimePage />} />
          <Route path="/ticket" element={<TicketPage />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
