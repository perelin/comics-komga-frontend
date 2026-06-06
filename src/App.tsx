import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LibraryBrowser } from './routes/LibraryBrowser'
import { SeriesDetail } from './routes/SeriesDetail'
import { ReadLists } from './routes/ReadLists'
import { ReadListDetail } from './routes/ReadListDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryBrowser />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
        <Route path="/readlists" element={<ReadLists />} />
        <Route path="/readlists/:id" element={<ReadListDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
