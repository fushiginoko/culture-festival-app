import './App.css'
import MenuPage from './pages/MenuPage'
import PickupTimePage from './pages/PickupTimePage'
import { BrowserRouter, Route, Routes } from 'react-router-dom'


function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/pickup-time" element={<PickupTimePage />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
