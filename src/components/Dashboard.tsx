'use client';

import { useState, useCallback } from 'react';
import { CHARTS_CONFIG, CHART_IDS, DataPoint } from '@/data/chartsData';
import D3Chart from '@/components/D3Chart';
import MiniChartCard from '@/components/MiniChartCard';
import ColorPicker from '@/components/ColorPicker';
import DataTable from '@/components/DataTable';

type AnalysisMode = 'bars' | 'table';

export default function Dashboard() {
  const [currentChartId, setCurrentChartId] = useState('ebitda');
  const [activeView, setActiveView] = useState<'analysis' | 'many'>('analysis');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('bars');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showPct, setShowPct] = useState(true);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [barColor, setBarColor] = useState<string | null>(null);

  const cfg = CHARTS_CONFIG[currentChartId];

  const switchChart = useCallback((chartId: string) => {
    setIsPlaying(false);
    setPlayIndex(0);
    setCurrentChartId(chartId);
  }, []);

  const handlePlayToggle = () => {
    if (analysisMode !== 'bars') setAnalysisMode('bars');
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setPlayIndex(0);
      setIsPlaying(true);
    }
  };

  const handlePlayFinish = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const statsArr = Object.values(cfg.stats);

  return (
    <div className="dashboard-container" onClick={() => setShowSettings(false)}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-square" style={{ background: '#f35325' }}></span>
            <span className="logo-square" style={{ background: '#81bc06' }}></span>
            <span className="logo-square" style={{ background: '#05a6f0' }}></span>
            <span className="logo-square" style={{ background: '#ffba08' }}></span>
          </div>
          <h1>
            {cfg.title} <i className="chevron-down"></i>
          </h1>
        </div>

        <div className="header-tabs">
          <button
            className={`tab-btn${activeView === 'many' ? ' active' : ''}`}
            onClick={() => setActiveView('many')}
          >
            📊 Many Charts
          </button>
          <button
            className={`tab-btn${activeView === 'analysis' ? ' active' : ''}`}
            onClick={() => setActiveView('analysis')}
          >
            📈 Analysis
          </button>
        </div>

        <div className="header-controls">
          <button
            className={`control-btn${analysisMode === 'bars' && activeView === 'analysis' ? ' active' : ''}`}
            onClick={() => { setActiveView('analysis'); setAnalysisMode('bars'); }}
          >
            <i className="icon-bars"></i> Bars
          </button>
          <button
            className={`control-btn${analysisMode === 'table' && activeView === 'analysis' ? ' active' : ''}`}
            id="btn-table"
            onClick={() => { setActiveView('analysis'); setAnalysisMode('table'); setIsPlaying(false); }}
          >
            <i className="icon-table"></i> Table
          </button>
          <button className="control-btn" id="btn-range">
            <i className="icon-calendar"></i> Range
          </button>
          <button
            className={`control-btn${isPlaying ? ' active' : ''}`}
            id="btn-play"
            onClick={handlePlayToggle}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <div className="settings-wrapper" id="settings-wrapper">
            <button
              className="control-btn"
              id="btn-settings"
              onClick={(e) => { e.stopPropagation(); setShowSettings(s => !s); }}
            >
              ⋮ Settings
            </button>
            {showSettings && (
              <div className="settings-panel open" onClick={e => e.stopPropagation()}>
                <div className="settings-title">Settings</div>
                <label className="settings-toggle" onClick={() => setShowLabels(v => !v)}>
                  <span className={`toggle-check${showLabels ? ' checked' : ''}`}>{showLabels ? '✓' : ''}</span>
                  Show Labels
                </label>
                <label className="settings-toggle" onClick={() => setShowPct(v => !v)}>
                  <span className={`toggle-check${showPct ? ' checked' : ''}`}>{showPct ? '✓' : ''}</span>
                  Show % Changes
                </label>
                <label className="settings-toggle" onClick={() => setShowTooltip(v => !v)}>
                  <span className={`toggle-check${showTooltip ? ' checked' : ''}`}>{showTooltip ? '✓' : ''}</span>
                  Show Tooltip
                </label>
                <label className="settings-toggle" onClick={() => setShowGrid(v => !v)}>
                  <span className={`toggle-check${showGrid ? ' checked' : ''}`}>{showGrid ? '✓' : ''}</span>
                  Grid
                </label>
                <ColorPicker color={barColor || '#1e4d2b'} onChange={setBarColor} />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="subtitle">{cfg.subtitle}</div>

      {/* Analysis View */}
      {activeView === 'analysis' && (
        <div id="analysis-view">
          <main className="dashboard-content">

            {/* ── Bars Mode ── */}
            {analysisMode === 'bars' && (
              <div className="chart-container" id="d3-chart-wrapper">
                {/* Info Panel */}
                <div className="info-panel" id="stats-card">
                  {!hoveredPoint ? (
                    statsArr.map((s, i) => (
                      <div key={i} className="info-item">
                        <span className="info-label">
                          <i className={`icon-${['chart','calendar','trend','sparkle','rocket'][i]}`}></i>
                          {' '}{s.label}
                        </span>
                        <span className={`info-value${s.cls ? ' ' + s.cls : ''}`}>{s.value}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="info-item">
                        <span className="info-label"><i className="icon-calendar"></i> Year</span>
                        <span className="info-value">{hoveredPoint.year}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label"><i className="icon-chart"></i> {cfg.title}</span>
                        <span className="info-value">${hoveredPoint.value.toFixed(1)}B</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label"><i className="icon-trend"></i> Growth %</span>
                        <span className={`info-value ${hoveredPoint.growth >= 0 ? 'growth-pos' : 'growth-neg'}`}>
                          {hoveredPoint.growth > 0 ? '+' : ''}{hoveredPoint.growth}%
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label"><i className="icon-sparkle"></i> Status</span>
                        <span className="info-value" style={{ textTransform: 'capitalize' }}>{hoveredPoint.status}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* D3 Chart */}
                <div id="d3-chart">
                  <D3Chart
                    key={currentChartId}
                    config={cfg}
                    isPlaying={isPlaying}
                    playIndex={playIndex}
                    onPlayStep={setPlayIndex}
                    onPlayFinish={handlePlayFinish}
                    onHover={setHoveredPoint}
                    onBarClick={setPlayIndex}
                    showLabels={showLabels}
                    showPct={showPct}
                    showTooltip={showTooltip}
                    showGrid={showGrid}
                    barColor={barColor}
                  />
                </div>
              </div>
            )}

            {/* ── Table Mode ── */}
            {analysisMode === 'table' && (
              <DataTable config={cfg} />
            )}

          </main>

          {/* Footer Navigation */}
          <footer className="dashboard-footer">
            {cfg.nav.back ? (
              <div className="nav-card" id="nav-back" onClick={() => switchChart(cfg.nav.back!.id)}>
                <div className="nav-label">BACK</div>
                <div className="nav-content">
                  <i className="arrow-left"></i>
                  <div className="nav-text">
                    <h3>{cfg.nav.back.title}</h3>
                    <p>{cfg.nav.back.desc}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'none' }} />
            )}
            {cfg.nav.next && (
              <div className="nav-card active" id="nav-next" onClick={() => switchChart(cfg.nav.next!.id)}>
                <div className="nav-label">NEXT</div>
                <div className="nav-content">
                  <div className="nav-text">
                    <h3>{cfg.nav.next.title}</h3>
                    <p>{cfg.nav.next.desc}</p>
                  </div>
                  <i className="arrow-right"></i>
                </div>
              </div>
            )}
          </footer>
        </div>
      )}

      {/* Many Charts View */}
      {activeView === 'many' && (
        <div id="many-charts-view" className="many-charts-grid">
          {CHART_IDS.map(id => (
            <MiniChartCard
              key={id}
              config={CHARTS_CONFIG[id]}
              onClick={() => { switchChart(id); setActiveView('analysis'); setAnalysisMode('bars'); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
