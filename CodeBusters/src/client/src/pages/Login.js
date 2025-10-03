import React from 'react';
import Navbar from '../components/Navbar';

const Login = () => {
    return (
        <>
            <Navbar />
            <div>
                <p>Login</p>
                <form>
                    <div>
                        <label htmlFor="username">Username:</label>
                        <input type="text" id="username" name="username" required />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input type="password" id="password" name="password" required />
                    </div>
                    <button type="submit">Login</button>
                </form>
                <p>
                    Don't have an account? <a href="/register">Register here</a>
                </p>
            </div>
        </>
    );
};

export default Login;