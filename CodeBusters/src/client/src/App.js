import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Content from './pages/Content';
import Register from './pages/Register';
import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <div className='App'>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/home' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/content' element={<Content />} />
      </Routes>
    </div>
  );
}

export default App;
