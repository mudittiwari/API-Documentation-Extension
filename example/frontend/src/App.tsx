import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  age: number;
  address: string;
  email: string;
  phone: string;
  occupation: string;
}

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<number>(0);
  const [address, setAddress] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
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
      const newUser = { name, age, address, email, phone, occupation };
      const response = await axios.post('http://localhost:8000/users', newUser);
      setUsers((prevUsers) => [...prevUsers, response.data.data]);
      setName('');
      setAge(0);
      setAddress('');
      setEmail('');
      setPhone('');
      setOccupation('');
    } catch (err) {
      setError('Error adding user');
      console.error(err);
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/users`, {
        params: {
          id,
        },
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
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter user name"
            required
            style={{ marginRight: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="age">Age</label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            placeholder="Enter age"
            required
            style={{ marginRight: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="address">Address</label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            required
            style={{ marginRight: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
            style={{ marginRight: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            required
            style={{ marginRight: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="occupation">Occupation</label>
          <input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Enter occupation"
            required
            style={{ marginRight: '10px' }}
          />
        </div>
        <button type="submit">Add User</button>
      </form>

      <h2>Users List</h2>
      {users.length > 0 ? (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              <strong>Name:</strong> {user.name} | <strong>Age:</strong> {user.age} | <strong>Address:</strong> {user.address} |{' '}
              <strong>Email:</strong> {user.email} | <strong>Phone:</strong> {user.phone} | <strong>Occupation:</strong> {user.occupation}{' '}
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
