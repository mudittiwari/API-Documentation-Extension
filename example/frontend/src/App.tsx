import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
}

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch all users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/users');
      setUsers(response.data.data);
    } catch (err) {
      setError('Error fetching users');
      console.error(err);
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/users', { name,age });
      setUsers((prevUsers) => [...prevUsers, response.data.data]);
      setName('');
    } catch (err) {
      setError('Error adding user');
      console.error(err);
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/users`,{
        params:{
          id
        }
      });
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
    } catch (err) {
      setError('Error deleting user');
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>User Management</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={addUser}>
        <input
          id='name'
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter user name"
          required
          style={{ marginRight: '10px' }}
        />
        <input
          type="number"
          id='age'
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          placeholder="Enter age"
          required
          style={{ marginRight: '10px' }}
        />
        <button type="submit">Add User</button>
      </form>

      <h2>Users List</h2>
      {users.length > 0 ? (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.name}{' '}
              <button onClick={() => deleteUser(user.id)} style={{ marginLeft: '10px' }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No users found</p>
      )}
    </div>
  );
};

export default App;
