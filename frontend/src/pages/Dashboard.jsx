import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ServerStatusCard } from '../components/dashboard/ServerStatusCard';
import { PlayerProfileCard } from '../components/dashboard/PlayerProfileCard';
import { InventoryCard } from '../components/dashboard/InventoryCard';
import { QuickStatsCard } from '../components/dashboard/QuickStatsCard';
import { ConnectedPlayersList } from '../components/dashboard/ConnectedPlayersList';
import { TopPlayersCard } from '../components/dashboard/TopPlayersCard';
import { BuildStatusCard } from '../components/dashboard/BuildStatusCard';
import { ConsoleModal } from '../components/dashboard/ConsoleModal';
import { ClaimServerModal } from '../components/dashboard/ClaimServerModal';
import { AuditLogsModal } from '../components/dashboard/AuditLogsModal';
import { BackupsModal } from '../components/dashboard/BackupsModal';
import { ServerPropertiesModal } from '../components/dashboard/ServerPropertiesModal';
import { GhostPanelCard } from '../components/dashboard/GhostPanelCard';
import { MineMarketView } from '../components/dashboard/MineMarketView';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBackupsModalOpen, setIsBackupsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <div className="mc-app-container">
      {/* Top Header */}
      <Header onOpenClaimModal={() => setIsClaimModalOpen(true)} />

      {/* 3-Column Layout Matching User Mockup */}
      <div className="mc-dashboard-grid">
        {/* Left Column: Sidebar Navigation & Creeper */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenConsole={() => setIsConsoleOpen(true)}
          onOpenAudit={() => setIsAuditModalOpen(true)}
          onOpenBackups={() => setIsBackupsModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Center Grid: Status, Profile, Inventory, Stats or Sub-views */}
        <main className="mc-center-col">
          {activeTab === 'minemarket' ? (
            <MineMarketView />
          ) : activeTab === 'comandos' ? (
            <>
              <ServerStatusCard />
              <GhostPanelCard />
            </>
          ) : activeTab === 'inventario' ? (
            <>
              <PlayerProfileCard />
              <InventoryCard />
            </>
          ) : activeTab === 'estadisticas' ? (
            <>
              <ServerStatusCard />
              <QuickStatsCard />
            </>
          ) : activeTab === 'jugadores' ? (
            <>
              <PlayerProfileCard />
              <div className="mc-subgrid">
                <InventoryCard />
                <QuickStatsCard />
              </div>
            </>
          ) : (
            <>
              {/* 1. Server Status Card */}
              <ServerStatusCard />

              {/* 2. Player Profile Card */}
              <PlayerProfileCard />

              {/* 3. Two-Column Subgrid: Inventory & Quick Stats */}
              <div className="mc-subgrid">
                <InventoryCard />
                <QuickStatsCard />
              </div>
            </>
          )}
        </main>

        {/* Right Column: Connected Players, Leaderboard, Build Info */}
        <aside className="mc-right-col">
          <ConnectedPlayersList />
          <TopPlayersCard />
          <BuildStatusCard />
        </aside>
      </div>

      {/* Interactive Modals */}
      <ConsoleModal 
        isOpen={isConsoleOpen} 
        onClose={() => setIsConsoleOpen(false)} 
      />

      <ClaimServerModal 
        isOpen={isClaimModalOpen} 
        onClose={() => setIsClaimModalOpen(false)} 
      />

      <AuditLogsModal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
      />

      <BackupsModal 
        isOpen={isBackupsModalOpen} 
        onClose={() => setIsBackupsModalOpen(false)} 
      />

      <ServerPropertiesModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </div>
  );
}

