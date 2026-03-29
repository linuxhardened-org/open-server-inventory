import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Inventory() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/inventory/servers', { withCredentials: true });
      setServers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/inventory/export', { withCredentials: true });
      const blob = new Blob([JSON.stringify(res.data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'servers.json';
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 flex h-screen relative">
      <div className="flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inventory</h1>
          <div className="space-x-4">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <button onClick={() => setShowWizard(true)} className="bg-green-600 text-white px-4 py-2 rounded">Add Server</button>
            <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded">Export</button>
          </div>
        </div>
        
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">IP</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s: any) => (
                <tr key={s.id} onClick={() => setSelectedServer(s)} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="p-4">{s.name}</td>
                  <td className="p-4">{s.ip}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${s.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedServer && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-96 bg-white border-l shadow-2xl absolute right-0 top-0 bottom-0 p-6 z-10"
          >
            <button onClick={() => setSelectedServer(null)} className="text-gray-500 float-right">Close</button>
            <h2 className="text-2xl font-bold mb-4">{selectedServer.name}</h2>
            <div className="space-y-4">
              <p><strong>IP Address:</strong> {selectedServer.ip}</p>
              <p><strong>Status:</strong> {selectedServer.status}</p>
              <p><strong>Group ID:</strong> {selectedServer.groupId}</p>
            </div>
            <button className="mt-8 w-full bg-blue-600 text-white py-2 rounded">Edit Server</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWizard && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded shadow-xl w-[500px]">
              <h2 className="text-2xl font-bold mb-4">Add New Server Wizard</h2>
              <form className="space-y-4">
                <input className="w-full p-2 border rounded" placeholder="Server Name" />
                <input className="w-full p-2 border rounded" placeholder="IP Address" />
                <div className="flex justify-end space-x-4 mt-6">
                  <button type="button" onClick={() => setShowWizard(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="button" onClick={() => setShowWizard(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
