import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  Settings, 
  BarChart3, 
  History, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  AlertTriangle,
  Search,
  Filter,
  Star,
  Trash2,
  Download,
  Upload,
  Clock,
  LayoutDashboard,
  Sun,
  Moon,
  ShieldCheck,
  RefreshCw,
  Check,
  Info,
  CheckCircle2,
  XCircle,
  ChevronRight,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StorageService } from './services/storageService';
import { Group, Campaign, AppSettings, LogEntry } from './types/index';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, theme }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
        : theme === 'dark'
          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className = "", theme }: any) => (
  <div className={`${
    theme === 'dark' 
      ? 'bg-zinc-900 border-zinc-800 text-white' 
      : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
  } border rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: any) => {
  const variants: any = {
    default: 'bg-zinc-800 text-zinc-300',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [groups, setGroups] = useState<Group[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [manualGroupName, setManualGroupName] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const addManualGroup = async () => {
    if (!manualGroupName.trim()) return;
    const groupName = manualGroupName.trim();
    
    // Check if group already exists
    if (groups.some(g => g.name.toLowerCase() === groupName.toLowerCase())) {
      setNotification({ message: 'Este grupo já existe na lista.', type: 'info' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const newGroup: Group = {
      id: groupName,
      name: groupName,
      lastMessage: '',
      lists: [],
      isFavorite: false,
      isExcluded: false
    };
    
    const updated = [...groups, newGroup];
    await StorageService.saveGroups(updated);
    setGroups(updated);
    
    if (showNewCampaignModal) {
      setNewCampaign(prev => ({
        ...prev,
        selectedGroups: [...prev.selectedGroups, groupName]
      }));
    }

    setManualGroupName('');
    setNotification({ message: 'Grupo adicionado com sucesso!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const closeNewCampaignModal = () => {
    setShowNewCampaignModal(false);
    setGroupSearchQuery('');
  };

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    selectedGroups: [] as string[],
    minDelay: 30,
    maxDelay: 120,
    media: null as File | null,
    antiBan: {
      randomSuffix: false,
      timeGreeting: false,
      spintax: true
    }
  });

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message || newCampaign.selectedGroups.length === 0) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    let mediaData = undefined;
    if (newCampaign.media) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(newCampaign.media!);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      mediaData = {
        type: newCampaign.media.type.startsWith('image') ? 'image' : 'video' as any,
        url: base64,
        filename: newCampaign.media.name
      };
    }

    const campaign: Campaign = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCampaign.name,
      messages: [newCampaign.message],
      media: mediaData,
      targetGroups: newCampaign.selectedGroups,
      status: 'draft',
      createdAt: Date.now(),
      stats: { total: newCampaign.selectedGroups.length, sent: 0, failed: 0 },
      settings: {
        minDelay: newCampaign.minDelay,
        maxDelay: newCampaign.maxDelay,
        pauseAfterXMessages: 20,
        pauseDuration: 10,
        randomizeOrder: true,
        simulateTyping: true,
        spintaxEnabled: true
      }
    };

    const updatedCampaigns = [campaign, ...campaigns];
    await StorageService.saveCampaigns(updatedCampaigns);
    setCampaigns(updatedCampaigns);
    closeNewCampaignModal();
    setNewCampaign({ name: '', message: '', selectedGroups: [], minDelay: 30, maxDelay: 120, media: null });
  };

  const toggleGroupSelection = (groupName: string) => {
    setNewCampaign(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupName)
        ? prev.selectedGroups.filter(g => g !== groupName)
        : [...prev.selectedGroups, groupName]
    }));
  };

  const toggleTheme = async () => {
    if (!settings) return;
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updatedSettings = { ...settings, theme: newTheme as 'light' | 'dark' };
    setSettings(updatedSettings);
    await StorageService.saveSettings(updatedSettings);
  };

  const toggleFavorite = async (id: string) => {
    const updatedGroups = groups.map(g => 
      g.id === id ? { ...g, isFavorite: !g.isFavorite } : g
    );
    setGroups(updatedGroups);
    await StorageService.saveGroups(updatedGroups);
  };

  const toggleExcluded = async (id: string) => {
    const updatedGroups = groups.map(g => 
      g.id === id ? { ...g, isExcluded: !g.isExcluded } : g
    );
    setGroups(updatedGroups);
    await StorageService.saveGroups(updatedGroups);
  };

  const selectAllGroups = (mode: 'all' | 'no-favorites' | 'only-favorites') => {
    let toSelect: string[] = [];
    if (mode === 'all') {
      toSelect = groups.filter(g => !g.isExcluded).map(g => g.name);
    } else if (mode === 'no-favorites') {
      toSelect = groups.filter(g => !g.isExcluded && !g.isFavorite).map(g => g.name);
    } else if (mode === 'only-favorites') {
      toSelect = groups.filter(g => !g.isExcluded && g.isFavorite).map(g => g.name);
    }
    setNewCampaign(prev => ({ ...prev, selectedGroups: toSelect }));
  };

  useEffect(() => {
    loadData();
    
    // Listen for storage changes to keep UI in sync
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.campaigns || changes.groups || changes.logs || changes.settings) {
        // Check for completed campaigns to show notification
        if (changes.campaigns) {
          const oldCampaigns = changes.campaigns.oldValue as Campaign[] || [];
          const newCampaigns = changes.campaigns.newValue as Campaign[] || [];
          
          newCampaigns.forEach(newC => {
            const oldC = oldCampaigns.find(o => o.id === newC.id);
            if (oldC && oldC.status !== 'completed' && newC.status === 'completed') {
              setNotification({
                message: `Campanha "${newC.name}" finalizada com sucesso!`,
                type: 'success'
              });
              // Auto hide after 5 seconds
              setTimeout(() => setNotification(null), 5000);
            }
          });
        }
        loadData();
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const g = await StorageService.getGroups();
      const c = await StorageService.getCampaigns();
      const s = await StorageService.getSettings();
      const l = await StorageService.getLogs();
      setGroups(g);
      setCampaigns(c);
      setSettings(s);
      setLogs(l);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const isExtension = () => typeof chrome !== 'undefined' && !!chrome.tabs && !!chrome.runtime;

  const scrapeGroups = async () => {
    if (!isExtension()) {
      alert('Esta funcionalidade requer a extensão instalada.');
      return;
    }
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    if (tabs.length === 0) {
      alert('Por favor, abra o WhatsApp Web primeiro.');
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id!, { action: 'SCRAPE_GROUPS' }, async (response) => {
      if (response?.groups) {
        const existing = await StorageService.getGroups();
        const newGroups = response.groups.map((g: any) => {
          const found = existing.find(ex => ex.name === g.name);
          return found || { ...g, lists: [], isFavorite: false, isExcluded: false };
        });
        await StorageService.saveGroups(newGroups);
        setGroups(newGroups);
        setNotification({ message: `${response.groups.length} grupos capturados com sucesso!`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ message: 'Nenhum grupo encontrado. Tente rolar a lista no WhatsApp Web.', type: 'info' });
        setTimeout(() => setNotification(null), 4000);
      }
    });
  };

  const startCampaign = (id: string) => {
    if (!isExtension()) {
      alert('Esta funcionalidade requer a extensão instalada.');
      return;
    }
    chrome.runtime.sendMessage({ action: 'START_CAMPAIGN', campaignId: id });
    loadData();
  };

  const pauseCampaign = (id: string) => {
    if (!isExtension()) {
      alert('Esta funcionalidade requer a extensão instalada.');
      return;
    }
    chrome.runtime.sendMessage({ action: 'PAUSE_CAMPAIGN', campaignId: id });
    loadData();
  };

  const deleteCampaign = async (id: string) => {
    const updatedCampaigns = campaigns.filter(c => c.id !== id);
    setCampaigns(updatedCampaigns);
    await StorageService.saveCampaigns(updatedCampaigns);
  };

  // --- Renderers ---

  const renderDashboard = () => {
    const activeCampaigns = campaigns.filter(c => c.status === 'running');
    
    return (
      <div className="space-y-10">
        {/* Notifications */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border flex items-center space-x-3 animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-500 text-white border-emerald-400' 
              : 'bg-sky-500 text-white border-sky-400'
          }`}>
            <ShieldCheck size={24} />
            <p className="font-bold">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-70">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>
        )}

        {/* Global Progress for Active Campaigns */}
        {activeCampaigns.length > 0 && (
          <Card theme={settings?.theme} className="border-emerald-500/30 bg-emerald-500/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                    <Play size={20} className="text-emerald-500 relative z-10" />
                  </div>
                  <h3 className="font-bold text-lg">Disparos em Andamento</h3>
                </div>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded">
                  {activeCampaigns.length} Ativa(s)
                </span>
              </div>
              
              {activeCampaigns.map(camp => (
                <div key={camp.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{camp.name}</span>
                    <span className="text-emerald-500 font-bold">
                      {camp.stats.sent} / {camp.stats.total} (Faltam {camp.stats.total - camp.stats.sent})
                    </span>
                  </div>
                  <div className={`w-full ${settings?.theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} h-3 rounded-full overflow-hidden border ${settings?.theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}>
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-1000 relative" 
                      style={{ width: `${(camp.stats.sent / camp.stats.total) * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card theme={settings?.theme} className="flex items-center p-6 hover:scale-[1.02] transition-all cursor-default group">
            <div className="flex-shrink-0 p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Users size={32} />
            </div>
            <div className="ml-5 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Total de Grupos</p>
              <h3 className="text-3xl font-black tracking-tight truncate">{groups.length}</h3>
            </div>
          </Card>
          <Card theme={settings?.theme} className="flex items-center p-6 hover:scale-[1.02] transition-all cursor-default group">
            <div className="flex-shrink-0 p-4 bg-sky-500/10 text-sky-500 rounded-2xl shadow-inner group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Send size={32} />
            </div>
            <div className="ml-5 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Enviados Hoje</p>
              <h3 className="text-3xl font-black tracking-tight truncate">{logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString() && l.status === 'success').length}</h3>
            </div>
          </Card>
          <Card theme={settings?.theme} className="flex items-center p-6 hover:scale-[1.02] transition-all cursor-default group">
            <div className="flex-shrink-0 p-4 bg-amber-500/10 text-amber-500 rounded-2xl shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Play size={32} />
            </div>
            <div className="ml-5 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Campanhas Ativas</p>
              <h3 className="text-3xl font-black tracking-tight truncate">{campaigns.filter(c => c.status === 'running').length}</h3>
            </div>
          </Card>
          <Card theme={settings?.theme} className="flex items-center p-6 hover:scale-[1.02] transition-all cursor-default group">
            <div className="flex-shrink-0 p-4 bg-rose-500/10 text-rose-500 rounded-2xl shadow-inner group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <AlertTriangle size={32} />
            </div>
            <div className="ml-5 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Falhas</p>
              <h3 className="text-3xl font-black tracking-tight truncate">{logs.filter(l => l.status === 'error').length}</h3>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Card theme={settings?.theme} className="flex flex-col h-[450px] p-6">
            <h3 className="text-xl font-black mb-6 flex items-center">
              <History size={24} className="mr-3 text-emerald-500" />
              Logs Recentes
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className={`h-full flex flex-col items-center justify-center ${settings?.theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  <History size={64} className="mb-4 opacity-10" />
                  <p className="font-medium">Nenhum log disponível</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`flex items-center justify-between p-4 ${
                    settings?.theme === 'dark' ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  } rounded-xl border hover:border-emerald-500/50 transition-all group`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_8px_rgba(16,185,129,0.4)]`} />
                      <div>
                        <p className="font-bold text-sm group-hover:text-emerald-500 transition-colors">{log.groupName}</p>
                        <p className={`text-xs ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                      {log.status === 'success' ? 'Enviado' : 'Erro'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card theme={settings?.theme} className="flex flex-col h-[450px] p-6">
            <h3 className="text-xl font-black mb-6 flex items-center">
              <Send size={24} className="mr-3 text-sky-500" />
              Campanhas Recentes
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {campaigns.length === 0 ? (
                <div className={`h-full flex flex-col items-center justify-center ${settings?.theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  <Send size={64} className="mb-4 opacity-10" />
                  <p className="font-medium">Nenhuma campanha criada</p>
                </div>
              ) : (
                campaigns.map(camp => (
                  <div key={camp.id} className={`p-5 ${
                    settings?.theme === 'dark' ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  } rounded-xl border hover:border-sky-500/50 transition-all`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-sm uppercase tracking-wider">{camp.name}</h4>
                      <Badge variant={
                        camp.status === 'completed' ? 'success' : 
                        camp.status === 'running' ? 'info' : 
                        camp.status === 'paused' ? 'warning' : 'default'
                      }>
                        {camp.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className={`w-full ${settings?.theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'} h-2 rounded-full overflow-hidden`}>
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                          style={{ width: `${(camp.stats.sent / camp.stats.total) * 100}%` }}
                        />
                      </div>
                      <div className={`flex justify-between text-[10px] font-bold uppercase tracking-widest ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <span>{camp.stats.sent} / {camp.stats.total} ENVIADOS</span>
                        <span>{Math.round((camp.stats.sent / camp.stats.total) * 100) || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderGroups = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciar Grupos</h2>
        <button 
          onClick={scrapeGroups}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Search size={18} />
          <span>Capturar Grupos</span>
        </button>
      </div>

      <Card theme={settings?.theme}>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por nome..."
              className={`w-full border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-emerald-500 transition-colors ${
                settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
              }`}
            />
          </div>
          <button className={`p-2 border rounded-lg transition-colors ${
            settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900'
          }`}>
            <Filter size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-sm border-b ${settings?.theme === 'dark' ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-100'}`}>
                <th className="pb-4 font-medium">Nome do Grupo</th>
                <th className="pb-4 font-medium">Última Mensagem</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${settings?.theme === 'dark' ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className={`p-6 rounded-2xl border ${settings?.theme === 'dark' ? 'bg-zinc-800/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <Users size={48} className="mx-auto mb-4 opacity-20" />
                        <p className={`mb-4 font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Nenhum grupo capturado ainda.
                        </p>
                        <div className="flex flex-col space-y-3">
                          <button 
                            onClick={scrapeGroups}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2"
                          >
                            <RefreshCw size={18} />
                            <span>Capturar do WhatsApp Web</span>
                          </button>
                          
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-zinc-700 opacity-20"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className={`${settings?.theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} px-2 text-zinc-500`}>Ou adicione manualmente</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Nome exato do grupo..."
                              value={manualGroupName}
                              onChange={e => setManualGroupName(e.target.value)}
                              className={`flex-1 ${
                                settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
                              } border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-all`}
                            />
                            <button
                              onClick={addManualGroup}
                              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-zinc-700"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                groups.map(group => (
                  <tr key={group.id} className={`group transition-colors ${settings?.theme === 'dark' ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'}`}>
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                          settings?.theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'
                        }`}>
                          {group.name.charAt(0)}
                        </div>
                        <span className="font-semibold">{group.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-zinc-500 truncate max-w-[200px]">
                      {group.lastMessage || 'Sem mensagens'}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        {group.isFavorite && <Badge variant="warning">Favorito</Badge>}
                        {group.isExcluded && <Badge variant="danger">Excluído</Badge>}
                        {!group.isFavorite && !group.isExcluded && <Badge variant="default">Ativo</Badge>}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleFavorite(group.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            group.isFavorite 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : settings?.theme === 'dark' 
                                ? 'hover:bg-zinc-700 text-zinc-400' 
                                : 'hover:bg-zinc-200 text-zinc-500'
                          }`}
                          title={group.isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                        >
                          <Star size={18} fill={group.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <button 
                          onClick={() => toggleExcluded(group.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            group.isExcluded 
                              ? 'bg-rose-500/10 text-rose-500' 
                              : settings?.theme === 'dark' 
                                ? 'hover:bg-zinc-700 text-zinc-400' 
                                : 'hover:bg-zinc-200 text-zinc-500'
                          }`}
                          title={group.isExcluded ? "Remover da Lista Negra" : "Excluir de Disparos"}
                        >
                          <AlertTriangle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderCampaigns = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${settings?.theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Campanhas</h2>
        <button 
          onClick={() => setShowNewCampaignModal(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={18} />
          <span>Nova Campanha</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {campaigns.length === 0 ? (
          <Card theme={settings?.theme} className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Send size={48} className="mb-4 opacity-20" />
            <p>Nenhuma campanha criada ainda.</p>
          </Card>
        ) : (
          campaigns.map(camp => (
            <Card key={camp.id} theme={settings?.theme} className="group">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className={`text-lg font-bold ${settings?.theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{camp.name}</h3>
                    <Badge variant={
                      camp.status === 'completed' ? 'success' : 
                      camp.status === 'running' ? 'info' : 
                      camp.status === 'paused' ? 'warning' : 'default'
                    }>
                      {camp.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className={`text-sm ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {camp.targetGroups.length} grupos selecionados • Criada em {new Date(camp.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {camp.status === 'running' ? (
                    <button 
                      onClick={() => pauseCampaign(camp.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        settings?.theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:text-amber-500' : 'bg-zinc-100 text-zinc-500 hover:text-amber-600'
                      }`}
                      title="Pausar"
                    >
                      <Pause size={18} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => startCampaign(camp.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        settings?.theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:text-emerald-500' : 'bg-zinc-100 text-zinc-500 hover:text-emerald-600'
                      }`}
                      title="Iniciar"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir esta campanha?')) {
                        deleteCampaign(camp.id);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      settings?.theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:text-rose-500' : 'bg-zinc-100 text-zinc-500 hover:text-rose-600'
                    }`}
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className={`flex justify-between text-xs font-bold uppercase tracking-widest ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <span>Progresso do Envio</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-emerald-500 font-black">{camp.stats.sent} / {camp.stats.total}</span>
                    <span className="opacity-30">•</span>
                    <span>{Math.round((camp.stats.sent / camp.stats.total) * 100) || 0}%</span>
                  </div>
                </div>
                <div className={`w-full ${settings?.theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} h-3 rounded-full overflow-hidden border ${settings?.theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'} relative`}>
                  <div 
                    className={`h-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.4)] relative ${
                      camp.status === 'running' ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${(camp.stats.sent / camp.stats.total) * 100}%` }}
                  >
                    {camp.status === 'running' && (
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    )}
                  </div>
                </div>
                {camp.status === 'running' && (
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-emerald-500 font-black animate-pulse flex items-center">
                      <Clock size={10} className="mr-1" />
                      FALTAM {camp.stats.total - camp.stats.sent} GRUPOS PARA FINALIZAR
                    </p>
                    <span className="text-[10px] text-zinc-500 font-medium italic">
                      Processando...
                    </span>
                  </div>
                )}
                <div className={`flex justify-between text-sm ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <span>{camp.stats.sent} enviados de {camp.stats.total}</span>
                  {camp.stats.failed > 0 && (
                    <span className="text-rose-500 font-medium">{camp.stats.failed} falhas</span>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <h3 className="text-lg font-bold flex items-center text-emerald-500">
          <Clock size={20} className="mr-2" />
          Limites e Delays
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={`text-sm ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Delay Mínimo (segundos)</label>
            <input 
              type="number" 
              defaultValue={30}
              className={`w-full ${
                settings?.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              } border rounded-lg p-2.5 focus:border-emerald-500 outline-none transition-colors`}
            />
          </div>
          <div className="space-y-2">
            <label className={`text-sm ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Delay Máximo (segundos)</label>
            <input 
              type="number" 
              defaultValue={120}
              className={`w-full ${
                settings?.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              } border rounded-lg p-2.5 focus:border-emerald-500 outline-none transition-colors`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold flex items-center text-sky-500">
          <AlertTriangle size={20} className="mr-2" />
          Segurança (Anti-Ban)
        </h3>
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 ${
            settings?.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          } border rounded-xl transition-colors`}>
            <div>
              <p className="font-medium">Simulação Humana</p>
              <p className={`text-xs ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Simula digitação e scroll antes de enviar.</p>
            </div>
            <div className="w-12 h-6 bg-emerald-600 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
          <div className={`flex items-center justify-between p-4 ${
            settings?.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          } border rounded-xl transition-colors`}>
            <div>
              <p className="font-medium">Modo Seguro</p>
              <p className={`text-xs ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Aumenta os intervalos automaticamente se detectar risco.</p>
            </div>
            <div className="w-12 h-6 bg-emerald-600 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <div className="pt-6">
        <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20">
          Salvar Configurações
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${
      settings?.theme === 'dark' ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    } font-sans selection:bg-emerald-500/30 transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`w-64 ${
        settings?.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      } border-r p-6 flex flex-col transition-colors duration-300`}>
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Send className="text-white transform -rotate-12" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">WhatsGroup <span className="text-emerald-500">Pro</span></h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            theme={settings?.theme}
          />
          <SidebarItem 
            icon={Users} 
            label="Grupos" 
            active={activeTab === 'groups'} 
            onClick={() => setActiveTab('groups')}
            theme={settings?.theme}
          />
          <SidebarItem 
            icon={Send} 
            label="Campanhas" 
            active={activeTab === 'campaigns'} 
            onClick={() => setActiveTab('campaigns')}
            theme={settings?.theme}
          />
          <SidebarItem 
            icon={History} 
            label="Histórico" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            theme={settings?.theme}
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            theme={settings?.theme}
          />
        </nav>

        <div className={`pt-6 border-t ${settings?.theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <SidebarItem 
            icon={settings?.theme === 'dark' ? Sun : Moon} 
            label={settings?.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'} 
            onClick={toggleTheme}
            theme={settings?.theme}
          />
          <SidebarItem 
            icon={Settings} 
            label="Configurações" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            theme={settings?.theme}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className={`text-sm font-semibold ${settings?.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase tracking-widest mb-1`}>
              {activeTab}
            </h2>
            <h1 className={`text-3xl font-bold ${settings?.theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
              {activeTab === 'dashboard' && 'Bem-vindo de volta'}
              {activeTab === 'groups' && 'Gerenciamento de Grupos'}
              {activeTab === 'campaigns' && 'Campanhas de Envio'}
              {activeTab === 'history' && 'Histórico de Atividades'}
              {activeTab === 'analytics' && 'Análise de Desempenho'}
              {activeTab === 'settings' && 'Configurações do Sistema'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>WhatsApp Web Conectado</span>
            </div>
            <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors">
              <Plus size={20} />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'groups' && renderGroups()}
            {activeTab === 'campaigns' && renderCampaigns()}
            {activeTab === 'settings' && renderSettings()}
            {/* Other tabs would be implemented similarly */}
            {(activeTab === 'history' || activeTab === 'analytics') && (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                <Clock size={48} className="mb-4 opacity-20" />
                <p className="text-lg">Funcionalidade em desenvolvimento...</p>
                <p className="text-sm">Esta seção estará disponível na próxima atualização.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* New Campaign Modal */}
        <AnimatePresence>
          {showNewCampaignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeNewCampaignModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`${
                  settings?.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                } border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative`}
              >
                <div className={`p-6 border-b ${settings?.theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'} flex items-center justify-between`}>
                  <h2 className="text-xl font-bold">Nova Campanha</h2>
                  <button 
                    onClick={closeNewCampaignModal}
                    className={`${settings?.theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} p-2 rounded-full transition-colors`}
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Nome da Campanha</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Ofertas de Verão"
                      value={newCampaign.name}
                      onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                      className={`w-full ${
                        settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                      } border rounded-lg p-3 focus:border-emerald-500 outline-none transition-colors`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Mensagem</label>
                    <textarea 
                      placeholder="Digite sua mensagem aqui... Use {nome} para personalizar."
                      value={newCampaign.message}
                      onChange={e => setNewCampaign({...newCampaign, message: e.target.value})}
                      rows={4}
                      className={`w-full ${
                        settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                      } border rounded-lg p-3 focus:border-emerald-500 outline-none transition-colors resize-none`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Mídia (Opcional)</label>
                    <div className={`border-2 border-dashed ${
                      settings?.theme === 'dark' ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
                    } rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 transition-colors`}>
                      <input 
                        type="file" 
                        className="hidden" 
                        id="media-upload" 
                        accept="image/*,video/*"
                        onChange={e => setNewCampaign({...newCampaign, media: e.target.files?.[0] || null})}
                      />
                      <label htmlFor="media-upload" className="cursor-pointer">
                        <Upload className="mx-auto mb-2 text-zinc-500" size={24} />
                        <p className={`text-sm ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Arraste ou clique para enviar imagem/vídeo</p>
                      </label>
                    </div>
                    {newCampaign.media && (
                      <div className={`flex items-center justify-between p-2 ${
                        settings?.theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                      } border rounded-lg`}>
                        <span className="text-xs text-emerald-500 truncate">{newCampaign.media.name}</span>
                        <button onClick={() => setNewCampaign({...newCampaign, media: null})} className="text-rose-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Delay Mín (seg)</label>
                      <input 
                        type="number" 
                        value={newCampaign.minDelay}
                        onChange={e => setNewCampaign({...newCampaign, minDelay: parseInt(e.target.value)})}
                        className={`w-full ${
                          settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                        } border rounded-lg p-3 focus:border-emerald-500 outline-none transition-colors`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Delay Máx (seg)</label>
                      <input 
                        type="number" 
                        value={newCampaign.maxDelay}
                        onChange={e => setNewCampaign({...newCampaign, maxDelay: parseInt(e.target.value)})}
                        className={`w-full ${
                          settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                        } border rounded-lg p-3 focus:border-emerald-500 outline-none transition-colors`}
                      />
                    </div>

                    {(newCampaign.minDelay < 15 || newCampaign.maxDelay < 30) && (
                      <div className={`col-span-2 p-3 rounded-lg flex items-center space-x-3 ${
                        settings?.theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200'
                      } border animate-pulse`}>
                        <AlertTriangle size={18} className="flex-shrink-0" />
                        <p className="text-xs font-medium">
                          Risco de Banimento: Delays muito curtos detectados. Recomendamos pelo menos 15s (mín) e 30s (máx) para maior segurança.
                        </p>
                      </div>
                    )}

                    {newCampaign.maxDelay <= newCampaign.minDelay && (
                      <div className={`col-span-2 p-3 rounded-lg flex items-center space-x-3 ${
                        settings?.theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
                      } border`}>
                        <AlertTriangle size={18} className="flex-shrink-0" />
                        <p className="text-xs font-medium">
                          Configuração Inválida: O delay máximo deve ser maior que o delay mínimo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Anti-Ban Section */}
                  <div className={`space-y-3 p-4 ${
                    settings?.theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                  } rounded-xl border`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>Opções Anti-Banimento</label>
                      <ShieldCheck size={16} className="text-emerald-500" />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={newCampaign.antiBan.randomSuffix}
                          onChange={e => setNewCampaign({
                            ...newCampaign, 
                            antiBan: { ...newCampaign.antiBan, randomSuffix: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={`text-xs ${settings?.theme === 'dark' ? 'text-zinc-400 group-hover:text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-700'} transition-colors`}>Adicionar sufixo aleatório (ID único)</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={newCampaign.antiBan.timeGreeting}
                          onChange={e => setNewCampaign({
                            ...newCampaign, 
                            antiBan: { ...newCampaign.antiBan, timeGreeting: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={`text-xs ${settings?.theme === 'dark' ? 'text-zinc-400 group-hover:text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-700'} transition-colors`}>Saudação por horário (Bom dia/tarde/noite)</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={newCampaign.antiBan.spintax}
                          onChange={e => setNewCampaign({
                            ...newCampaign, 
                            antiBan: { ...newCampaign.antiBan, spintax: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={`text-xs ${settings?.theme === 'dark' ? 'text-zinc-400 group-hover:text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-700'} transition-colors`}>Habilitar Spintax {`{opção1|opção2}`}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${settings?.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Selecionar Grupos ({newCampaign.selectedGroups.length})</label>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => selectAllGroups('all')}
                          className="text-xs text-emerald-500 hover:underline"
                        >
                          Todos
                        </button>
                        <button 
                          onClick={() => selectAllGroups('only-favorites')}
                          className="text-xs text-sky-500 hover:underline"
                        >
                          Favoritos
                        </button>
                        <button 
                          onClick={() => selectAllGroups('no-favorites')}
                          className="text-xs text-amber-500 hover:underline"
                        >
                          Exceto Favoritos
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar grupos..."
                        value={groupSearchQuery}
                        onChange={e => setGroupSearchQuery(e.target.value)}
                        className={`w-full ${
                          settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                        } border rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {groups
                        .filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                        .map(g => (
                          <button
                            key={g.id}
                            onClick={() => toggleGroupSelection(g.name)}
                            className={`flex items-center space-x-2 p-2 rounded-lg border text-left transition-colors ${
                              newCampaign.selectedGroups.includes(g.name)
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                                : settings?.theme === 'dark' 
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                  : 'bg-white border-zinc-200 text-zinc-600'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-sm border ${
                              newCampaign.selectedGroups.includes(g.name) 
                                ? 'bg-emerald-500 border-emerald-500' 
                                : settings?.theme === 'dark' ? 'border-zinc-600' : 'border-zinc-300'
                            }`} />
                            <span className="text-xs truncate">{g.name}</span>
                          </button>
                        ))}
                      {groups.filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).length === 0 && (
                        <div className="col-span-2 py-4 text-center">
                          <p className={`${settings?.theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} text-xs italic mb-3`}>
                            Nenhum grupo encontrado.
                          </p>
                          <div className="flex flex-col space-y-2 px-2">
                            <p className="text-[10px] uppercase font-bold text-zinc-500 text-left">Adicionar Manualmente:</p>
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                placeholder="Nome exato do grupo..."
                                value={manualGroupName}
                                onChange={e => setManualGroupName(e.target.value)}
                                className={`flex-1 ${
                                  settings?.theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                                } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500`}
                              />
                              <button
                                onClick={addManualGroup}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-6 border-t ${settings?.theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'} flex space-x-3`}>
                  <button 
                    onClick={closeNewCampaignModal}
                    className={`flex-1 px-4 py-3 ${
                      settings?.theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'
                    } rounded-xl font-bold transition-colors`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateCampaign}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Criar Campanha
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Global CSS for scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}} />
      {notification && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            notification.type === 'success' 
              ? 'bg-emerald-500 border-emerald-400 text-white' 
              : 'bg-sky-500 border-sky-400 text-white'
          }`}>
            <div className="bg-white/20 p-1.5 rounded-lg">
              {notification.type === 'success' ? <Check size={20} /> : <Info size={20} />}
            </div>
            <p className="font-bold text-sm tracking-wide">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
