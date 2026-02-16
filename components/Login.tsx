import React, { useState, useEffect } from 'react';
import { User, UserRole, UserCredential, AuxiliarData } from '../types';
import { fetchUsers, fetchAuxiliar } from '../services/dataService';
import { ShieldCheck, ChevronRight, Loader2, KeyRound, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<'OM' | 'ADMIN'>('OM');
  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [adminConfig, setAdminConfig] = useState<{email: string, password: string}>({email: '', password: ''});
  const [selectedOM, setSelectedOM] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [usersRes, auxRes] = await Promise.all([
          fetchUsers(),
          fetchAuxiliar()
        ]);
        
        const allUsers = usersRes.users;
        setCredentials(allUsers);
        
        // Configura credenciais de Admin vindas de Usuarios (usersRes)
        setAdminConfig({
          email: usersRes.adminEmail,
          password: usersRes.adminPassword || ''
        });
        
        // Lógica de persistência da OM
        const savedOM = localStorage.getItem('lastSelectedOM');
        const defaultOM = allUsers.length > 0 ? allUsers[0].om : '';
        
        if (savedOM && allUsers.some(u => u.om === savedOM)) {
          setSelectedOM(savedOM);
        } else {
          setSelectedOM(defaultOM);
        }

      } catch (e: any) {
        console.error(e);
        setError('Falha de conexão com o banco de dados. Verifique os GIDs e as permissões da planilha.');
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleOMChange = (newOM: string) => {
    setSelectedOM(newOM);
    localStorage.setItem('lastSelectedOM', newOM);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedRole === 'ADMIN') {
      const inputPass = password.trim();
      const serverAdminPass = adminConfig.password.trim();
      
      // Se a senha na planilha estiver vazia, usa 'admin' como fallback
      const effectivePass = serverAdminPass !== '' ? serverAdminPass : 'admin';
      
      if (inputPass === effectivePass) {
        onLogin({ name: 'Administrador', role: UserRole.ADMIN, email: adminConfig.email });
      } else {
        setError(serverAdminPass === '' ? 'Senha padrão: admin (H2 vazia)' : 'Senha administrativa incorreta.');
      }
      return;
    }

    const userEntry = credentials.find(u => u.om === selectedOM && u.senha.trim() === password.trim());
    if (userEntry) {
      localStorage.setItem('lastSelectedOM', selectedOM);
      onLogin({ 
        name: `Oficial ${selectedOM}`, 
        role: UserRole.OM, 
        om: selectedOM,
        email: userEntry.email 
      });
    } else {
      setError('Senha incorreta para a OM selecionada.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <Loader2 className="w-10 h-10 text-army-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium animate-pulse uppercase text-xs tracking-widest">Acessando Planilha Google...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="bg-army-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-army-700 rounded-full mb-4 ring-4 ring-army-600">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">4ª Bda Inf L Mth</h2>
          <p className="text-army-200 mt-2 text-xs font-bold uppercase tracking-widest leading-tight">Sistema de Controle de Gratificação de Representação</p>
        </div>

        <div className="p-8">
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                selectedRole === 'OM' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => { setSelectedRole('OM'); setError(''); }}
            >
              Organização Militar
            </button>
            <button
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                selectedRole === 'ADMIN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => { setSelectedRole('ADMIN'); setError(''); }}
            >
              Administrador
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {selectedRole === 'OM' && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Selecione sua OM</label>
                <select
                  value={selectedOM}
                  onChange={(e) => handleOMChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-army-500 focus:outline-none transition font-medium text-sm"
                >
                  {credentials.length > 0 ? (
                    credentials.map(c => (
                      <option key={c.om} value={c.om}>{c.om}</option>
                    ))
                  ) : (
                    <option disabled>Nenhuma OM carregada</option>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Senha de Acesso</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-army-500 focus:outline-none transition"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {error && (
              <div className="flex items-start bg-red-50 border border-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-xs text-red-600 font-medium leading-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-lg shadow-md text-sm font-bold text-white bg-army-700 hover:bg-army-800 transition-all uppercase tracking-widest active:scale-95"
            >
              Entrar no Sistema
              <ChevronRight className="ml-2 w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;