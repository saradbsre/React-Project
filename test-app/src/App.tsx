import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RealEstate from './features/realestate/RealEstate';
import LoginForm from './features/login/LoginForm';
import TCRegular from './features/realestate/tenancy-contract/Regular';
import RequireAuth from './components/auth'; // Make sure this path is correct

function App() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/" element={<LoginForm />} />
    
      {/* Protected routes inside Layout */}
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="maintenance" element={<TCRegular />} />
        <Route path="realestate" element={<RealEstate />} />
      </Route>
    </Routes>
  );
}

export default App;
