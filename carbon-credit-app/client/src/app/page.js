'use client'
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Notification from '../components/Notification';

// Aktivite türüne göre kredi puanı hesaplama fonksiyonu
function calculateCredit(activityType, amount) {
  const multipliers = {
    yürüyüş: 4,
    bisiklet: 3,
    'toplu taşıma': 2,
    otobüs: 2,
    metro: 2,
    tramvay: 2,
  };
  const multiplier = multipliers[activityType?.toLowerCase()] || 2;
  return Number(amount) * multiplier;
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [activityType, setActivityType] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [activities, setActivities] = useState([]);
  const [balance, setBalance] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [sortType, setSortType] = useState('desc-date'); // varsayılan: en yeni
  const [loading, setLoading] = useState(true);
  const [canChangeWallet, setCanChangeWallet] = useState(false);
  const walletInputRef = useRef(null);
  const router = useRouter();

  const activityTypes = [
    'bisiklet',
    'yürüyüş',
    'toplu taşıma',
    'otobüs',
    'metro',
    'tramvay'
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('walletAddress');
      if (saved) setWalletAddress(saved);
    }
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setActivities(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Veri alınamadı:', error);
        setActivities([]);
      }
    };

    fetchActivities();
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress) {
        setBalance(null);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/balance/${walletAddress}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setBalance(data.totalToken);
      } catch (error) {
        setBalance(null);
      }
    };
    fetchBalance();
  }, [walletAddress, activities]);

  useEffect(() => {
    if (walletAddress) {
      localStorage.setItem('walletAddress', walletAddress);
    }
  }, [walletAddress]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('walletAddress');
    router.push('/login');
  };

  const handleChangeWallet = () => {
    setWalletAddress('');
    setCanChangeWallet(false);
    localStorage.removeItem('walletAddress');
    setTimeout(() => {
      walletInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        walletAddress,
        activityType,
        amount: Number(amount),
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage('Aktivite kaydedildi ✅');
      setActivities((prev) => [data.activity, ...prev]);
      setActivityType('');
      setAmount('');
    } else {
      setMessage('HATA: ' + (data.error || 'Bilinmeyen bir hata oluştu.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activity/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setMessage('Aktivite başarıyla silindi ✅');
        setActivities((prevActivities) => prevActivities.filter((activity) => activity._id !== id));
      } else {
        const errorData = await response.json();
        setMessage('HATA: ' + (errorData.error || 'Silme işlemi başarısız.'));
      }
    } catch (error) {
      console.error('Silme işlemi başarısız:', error);
      setMessage('HATA: Silme işlemi başarısız.');
    }
  };

  // Sıralama fonksiyonu
  const getSortedActivities = () => {
    let arr = [...activities].filter((item) => !filterType || item.activityType === filterType);
    if (sortType === 'desc-date') {
      arr.sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));
    } else if (sortType === 'asc-date') {
      arr.sort((a, b) => new Date(a.createdAt || a._id) - new Date(b.createdAt || b._id));
    } else if (sortType === 'desc-credit') {
      arr.sort((a, b) => calculateCredit(b.activityType, b.amount) - calculateCredit(a.activityType, a.amount));
    } else if (sortType === 'asc-credit') {
      arr.sort((a, b) => calculateCredit(a.activityType, a.amount) - calculateCredit(b.activityType, b.amount));
    }
    return arr;
  };

  const filteredActivities = getSortedActivities();

  // Toplam kredi puanını hesapla
  const totalCredit = filteredActivities.reduce(
    (sum, item) => sum + calculateCredit(item.activityType, item.amount),
    0
  );

  if (loading) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-200 via-green-400 to-green-700 text-green-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-end max-w-4xl mx-auto">
        <button
          onClick={handleLogout}
          className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all duration-300 font-semibold"
        >
          Çıkış Yap
        </button>
      </div>
      {/* Toplam kredi puanı kutucuğu */}
      <div className="max-w-4xl mx-auto mt-10 mb-2 flex justify-end">
        <div className="bg-green-100 border border-green-400/30 rounded-lg px-4 py-2 text-sm text-green-900 shadow-sm">
          Toplam Kredi Puanı: <span className="font-bold text-green-700">{totalCredit}</span>
        </div>
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-green-700 via-green-600 to-green-400 drop-shadow-lg">
        Karbon Aktivitesi Bildir
      </h1>
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto backdrop-blur-lg bg-green-50/80 p-8 rounded-2xl shadow-2xl space-y-6 border border-green-400/30"
      >
        <div className="flex items-center gap-2">
          <input
            ref={walletInputRef}
            type="text"
            placeholder="Cüzdan Adresi"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full bg-green-100 text-green-900 p-4 rounded-lg border border-green-400/30 focus:border-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none transition duration-300"
            required
            disabled={Boolean(walletAddress) && !canChangeWallet}
          />
          {walletAddress && !canChangeWallet && (
            <button
              type="button"
              className="ml-2 px-3 py-2 bg-yellow-400 text-green-900 rounded hover:bg-yellow-300 text-xs"
              onClick={() => setCanChangeWallet(true)}
            >
              Cüzdanı değiştir
            </button>
          )}
          {canChangeWallet && (
            <button
              type="button"
              className="ml-2 px-3 py-2 bg-red-400 text-white rounded hover:bg-red-300 text-xs"
              onClick={handleChangeWallet}
            >
              Sıfırla
            </button>
          )}
        </div>
        {/* Aktivite türü için select menüsü */}
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="w-full bg-green-100 text-green-900 p-4 rounded-lg border border-green-400/30 focus:border-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none transition duration-300"
          required
        >
          <option value="">Aktivite Türü Seçiniz</option>
          {activityTypes.map((type) => (
            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Miktar (örnek: 3 km)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-green-100 text-green-900 p-4 rounded-lg border border-green-400/30 focus:border-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none transition duration-300"
          required
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-700 via-green-600 to-green-400 text-white py-4 px-8 rounded-lg font-semibold hover:from-green-600 hover:via-green-500 hover:to-green-300 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-green-500/25"
        >
          Gönder
        </button>
      </form>
      <Notification
        message={message}
        type={message.includes('HATA') ? 'error' : 'success'}
        onClose={() => setMessage('')}
      />
      <div className="max-w-2xl mx-auto mb-6 mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full md:w-1/2 bg-green-100 text-green-900 p-3 rounded-lg border border-green-400/30 focus:border-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none transition duration-300 shadow-md md:text-lg text-base"
          style={{
            minWidth: 0,
            fontWeight: 500,
            borderRadius: '0.75rem',
            boxShadow: '0 2px 8px 0 rgba(34,197,94,0.08)'
          }}
        >
          <option value="">Tümünü Göster</option>
          <option value="bisiklet">Bisiklet</option>
          <option value="yürüyüş">Yürüyüş</option>
          <option value="toplu taşıma">Toplu Taşıma</option>
          <option value="otobüs">Otobüs</option>
          <option value="metro">Metro</option>
          <option value="tramvay">Tramvay</option>
        </select>
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="w-full md:w-1/2 bg-green-100 text-green-900 p-3 rounded-lg border border-green-400/30 focus:border-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none transition duration-300 shadow-md md:text-lg text-base"
          style={{
            minWidth: 0,
            fontWeight: 500,
            borderRadius: '0.75rem',
            boxShadow: '0 2px 8px 0 rgba(34,197,94,0.08)'
          }}
        >
          <option value="desc-date">En Yeni (Sondan başa)</option>
          <option value="asc-date">En Eski (Baştan sona)</option>
          <option value="desc-credit">En Fazla Krediden → En Aza</option>
          <option value="asc-credit">En Az Krediden → En Fazlaya</option>
        </select>
      </div>
      <div className="max-w-4xl mx-auto mt-16 backdrop-blur-lg bg-green-50/80 rounded-2xl p-8 border border-green-400/30">
        <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-700 via-green-600 to-green-400">
          Gönderilen Aktiviteler
        </h2>
        {filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((item) => (
              <div
                key={item._id}
                className="bg-gradient-to-r from-green-200/70 to-green-400/70 rounded-xl p-6 backdrop-blur-sm border border-green-400/30 hover:border-green-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20"
              >
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-2">
                    <p className="text-green-900">
                      <span className="text-green-700 font-semibold">Cüzdan:</span> {item.walletAddress}
                    </p>
                    <p className="text-green-900">
                      <span className="text-green-700 font-semibold">Aktivite Türü:</span> {item.activityType}
                    </p>
                    <p className="text-green-900">
                      <span className="text-green-700 font-semibold">Miktar:</span> {item.amount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-green-400">
                      {calculateCredit(item.activityType, item.amount)}
                    </p>
                    <p className="text-sm text-green-700">Kredi Puanı</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="mt-4 bg-green-700 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-all duration-300"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-green-700 text-center italic">Henüz aktivite gönderilmedi.</p>
        )}
      </div>
    </main>
  );
}
