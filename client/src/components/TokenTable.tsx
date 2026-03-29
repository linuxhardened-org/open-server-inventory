import { Trash2, Key, Clock, Calendar } from 'lucide-react';
import { ApiToken } from '../types';

interface TokenTableProps {
  tokens: ApiToken[];
  onRevoke: (id: number) => void;
}

export default function TokenTable({ tokens, onRevoke }: TokenTableProps) {
  return (
    <div className="bg-[#111118] border border-[#1a1a2e] rounded-xl overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-[#1a1a2e] text-gray-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4">Token Name</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4">Last Used</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a1a2e]">
          {tokens.map((token) => (
            <tr key={token.id} className="hover:bg-white/[0.02] transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium">{token.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(token.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onRevoke(token.id)}
                  className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Revoke Token"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {tokens.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                No API tokens generated yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
