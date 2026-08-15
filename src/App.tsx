import { HashRouter, Route, Routes } from 'react-router-dom';
import MainMenu from './pages/MainMenu'
import Games from './pages/Games';
import Options from './pages/Options';
import Quit from './pages/Quit';
import { start } from '../electron/utils/gamepad';


function App() {
  start();
  
  return (
      <HashRouter>
        {/* Routes swap out the entire cube */}
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/games" element={<Games />} />
          <Route path="/options" element={<Options />} />
          <Route path="/quit" element={<Quit />} />
        </Routes>
      </HashRouter>
  )
}

export default App