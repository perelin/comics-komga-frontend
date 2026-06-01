import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LibraryBrowser } from './routes/LibraryBrowser'
import { SeriesDetail } from './routes/SeriesDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryBrowser />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
