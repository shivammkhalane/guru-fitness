import React from 'react';

export default function Dashboard() {
  // Mock data mapping to Shadcn's layout
  const recentCheckIns = [
    { name: 'Rahul Sharma', email: 'rahul.s@email.com', plan: 'Annual VIP', time: 'Just now', initials: 'RS' },
    { name: 'Priya Patel', email: 'priya.p@email.com', plan: 'Quarterly', time: '5m ago', initials: 'PP' },
    { name: 'Aman Verma', email: 'aman.v@email.com', plan: 'Monthly', time: '12m ago', initials: 'AV' },
    { name: 'Neha Gupta', email: 'neha.g@email.com', plan: 'Annual VIP', time: '24m ago', initials: 'NG' },
    { name: 'Vikram Singh', email: 'vikram.s@email.com', plan: 'Personal Training', time: '1h ago', initials: 'VS' },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-zinc-50 h-full overflow-y-auto">
      {/* Header Area */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <button className="bg-white border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 text-zinc-950 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors hidden md:flex items-center gap-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Jan 20, 2026 - Feb 09, 2026
          </button>
          <button className="bg-zinc-900 hover:bg-zinc-900/90 text-zinc-50 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm inline-flex items-center justify-center">
            Download Report
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-950">Total Revenue</h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold tracking-tight text-zinc-950">₹1,84,500</div>
            <p className="text-xs text-zinc-500">+20.1% from last month</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-950">Active Members</h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold tracking-tight text-zinc-950">+248</div>
            <p className="text-xs text-zinc-500">+14 new this month</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-950">Check-ins Today</h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold tracking-tight text-zinc-950">142</div>
            <p className="text-xs text-zinc-500">+19% from yesterday</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-zinc-950">Expiring Soon</h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold tracking-tight text-zinc-950">12</div>
            <p className="text-xs text-zinc-500">Requires follow-up</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid (Chart + Recent Activity) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* The Bar Chart Area (col-span-4) */}
        <div className="col-span-4 rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight text-zinc-950">Overview</h3>
            <p className="text-sm text-zinc-500">Monthly check-in trends and revenue.</p>
          </div>
          <div className="p-6 pt-0 flex items-end justify-between h-[350px] space-x-2">
            {/* Pure CSS Bar Chart Mockup (No external libraries) */}
            {[40, 70, 30, 85, 50, 45, 90, 100, 60, 40, 75, 50].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2">
                <div className="w-full bg-zinc-900 rounded-sm" style={{ height: `${height}%` }}></div>
                <span className="text-[10px] text-zinc-500 uppercase">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed (col-span-3) */}
        <div className="col-span-3 rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight text-zinc-950">Recent Check-ins</h3>
            <p className="text-sm text-zinc-500">264 scans logged this week.</p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-8">
              {recentCheckIns.map((user, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-100 items-center justify-center border border-zinc-200">
                    <span className="text-sm font-medium text-zinc-950">{user.initials}</span>
                  </span>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none text-zinc-950">{user.name}</p>
                    <p className="text-sm text-zinc-500">{user.email}</p>
                  </div>
                  <div className="ml-auto flex flex-col items-end">
                    <div className="font-medium text-sm text-zinc-950">{user.plan}</div>
                    <div className="text-xs text-zinc-500">{user.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}