'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartConfig, DataPoint } from '@/data/chartsData';

interface D3ChartProps {
  config: ChartConfig;
  isPlaying: boolean;
  playIndex: number;
  onPlayStep?: (index: number) => void;
  onPlayFinish: () => void;
  onHover?: (data: DataPoint | null) => void;
  onBarClick?: (index: number) => void;
  showLabels: boolean;
  showPct: boolean;
  showTooltip: boolean;
  showGrid: boolean;
  barColor: string | null;
}

const margin = { top: 60, right: 100, bottom: 50, left: 30 };

function getChartHeight(width: number) {
  if (width <= 640) return 280;
  if (width <= 1024) return 380;
  return 500;
}

export default function D3Chart({
  config,
  isPlaying,
  playIndex,
  onPlayStep,
  onPlayFinish,
  onHover,
  onBarClick,
  showLabels,
  showPct,
  showTooltip,
  barColor,
}: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const xRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const yRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const widthRef = useRef(0);
  const heightRef = useRef(0);
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, HTMLElement, undefined> | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const onPlayFinishRef = useRef(onPlayFinish);
  onPlayFinishRef.current = onPlayFinish;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onBarClickRef = useRef(onBarClick);
  onBarClickRef.current = onBarClick;
  const onPlayStepRef = useRef(onPlayStep);
  onPlayStepRef.current = onPlayStep;

  const buildChart = useCallback(() => {
    if (!containerRef.current) return;
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const totalWidth = rect.width || 900;
    widthRef.current = totalWidth - margin.left - margin.right;
    heightRef.current = getChartHeight(totalWidth) - margin.top - margin.bottom;
    const W = widthRef.current;
    const H = heightRef.current;
    const data = config.data;

    const svgEl = container.append('svg')
      .attr('viewBox', `0 0 ${W + margin.left + margin.right} ${H + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('animation', 'chartFadeIn 0.4s ease');

    const svg = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    svgRef.current = svg;

    const xMin = d3.min(data, d => d.year) ?? 2014;
    const xMax = d3.max(data, d => d.year) ?? 2030;
    const x = d3.scaleLinear().domain([xMin, xMax + 0.5]).range([0, W - 20]);
    const y = d3.scaleLinear().domain([0, config.yMax]).range([H, 0]);
    xRef.current = x;
    yRef.current = y;

    // Defs / Gradients
    const defs = svgEl.append('defs');
    const pastG = defs.append('linearGradient').attr('id', 'past-gradient')
      .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
    pastG.append('stop').attr('offset','0%').attr('stop-color', barColor || config.gradients.past.top);
    pastG.append('stop').attr('offset','100%').attr('stop-color', config.gradients.past.bottom);

    const futG = defs.append('linearGradient').attr('id', 'future-gradient')
      .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
    futG.append('stop').attr('offset','0%').attr('stop-color', config.gradients.future.top);
    futG.append('stop').attr('offset','100%').attr('stop-color', config.gradients.future.bottom);

    // Future overlay
    const futureStartIndex = data.findIndex(d => d.status === 'future');
    if (futureStartIndex > 0) {
      const sepX = (x(data[futureStartIndex - 1].year) + x(data[futureStartIndex].year)) / 2;
      svg.append('rect').attr('x', sepX).attr('y', -20).attr('width', W - sepX)
        .attr('height', H + 20).attr('fill', config.gradients.future.bottom).attr('opacity', 0.07);
      svg.append('line').attr('x1',sepX).attr('x2',sepX).attr('y1',-30).attr('y2',H)
        .attr('stroke','#e2e8f0').attr('stroke-width',2).attr('stroke-dasharray','5,5');
      svg.append('text').attr('x', sepX - 10).attr('y', -35).attr('text-anchor','end')
        .attr('font-size','12px').attr('font-weight','600').attr('fill','#64748b').text('Past');
      svg.append('text').attr('x', sepX + 10).attr('y', -35).attr('text-anchor','start')
        .attr('font-size','12px').attr('font-weight','600').attr('fill', config.gradients.future.top).text('Future');
    }

    // Grid
    svg.append('g').attr('class','grid grid-vertical').attr('transform',`translate(0,${H})`)
      .call(d3.axisBottom(x).tickValues(data.map(d=>d.year)).tickSize(-H).tickFormat(() => ''))
      .selectAll('line').attr('stroke','#f8fafc');
    svg.select('.grid-vertical .domain').remove();

    svg.append('g').attr('class','grid grid-horizontal')
      .call(d3.axisLeft(y).tickSize(-W).tickFormat(() => '').ticks(7))
      .selectAll('line').attr('stroke','#f1f5f9');
    svg.select('.grid-horizontal .domain').remove();

    // X Axis
    svg.append('g').attr('transform',`translate(0,${H})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(15).tickFormat(d3.format('d')))
      .attr('font-family','Inter').attr('font-size','11px').attr('color','#94a3b8')
      .select('.domain').remove();

    // Y Axis
    svg.append('g').attr('transform',`translate(${W},0)`)
      .call(d3.axisRight(y).ticks(7)
        .tickFormat(d => (d as number) === config.yMax ? '' : `$${(d as number).toFixed(1)}B`)
        .tickSize(0).tickPadding(10))
      .attr('font-family','Inter').attr('font-size','11px').attr('color','#94a3b8')
      .select('.domain').remove();

    // Projection box
    const projY = y(config.projectionTarget);
    const hG = svg.append('g').attr('transform',`translate(${W + 12},${projY})`);
    hG.append('rect').attr('x',0).attr('y',-10).attr('width',45).attr('height',20).attr('rx',4)
      .attr('fill', config.gradients.future.top);
    hG.append('text').attr('x',5).attr('y',4).attr('fill','white').attr('font-size','10px')
      .attr('font-weight','700').text(`$${config.projectionTarget}B`);

    // Bars
    const barWidth = (W / (data.length - 1)) * 0.7;
    svg.selectAll('.bar').data(data).enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.year) - barWidth / 2)
      .attr('width', barWidth)
      .attr('y', H).attr('height', 0)
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', d => d.status === 'past' ? 'url(#past-gradient)' : 'url(#future-gradient)')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        const idx = data.findIndex(nd => nd.year === d.year);
        onBarClickRef.current?.(idx);
      })
      .transition().duration(1200).ease(d3.easeCubicOut)
      .attr('y', d => y(d.value))
      .attr('height', d => H - y(d.value));

    // Labels
    if (showLabels) {
      svg.selectAll('.bar-label').data(data).enter().append('text')
        .attr('class','bar-label')
        .attr('x', d => x(d.year)).attr('y', d => y(d.value) - 20)
        .attr('text-anchor','middle').attr('font-size','11px').attr('font-weight','700')
        .attr('fill','#101828').attr('opacity',0)
        .text(d => `$${Math.round(d.value)}B`)
        .transition().delay(1000).duration(500).attr('opacity',1);
    }

    if (showPct) {
      svg.selectAll('.growth-label').data(data).enter().append('text')
        .attr('class','growth-label')
        .attr('x', d => x(d.year)).attr('y', d => y(d.value) - 6)
        .attr('text-anchor','middle').attr('font-size','10px').attr('font-weight','700')
        .attr('fill', d => d.growth >= 0 ? '#2ecc71' : '#e74c3c').attr('opacity',0)
        .text(d => `${d.growth > 0 ? '+' : ''}${d.growth}%`)
        .transition().delay(1200).duration(500).attr('opacity',1);
    }

    // Projection line
    svg.append('line').attr('x1',0).attr('x2',W).attr('y1',projY).attr('y2',projY)
      .attr('stroke', config.gradients.future.top).attr('stroke-width',1.5)
      .attr('stroke-dasharray','5,5').attr('opacity',0.3).lower();

    // Tooltip
    let tooltip = d3.select<HTMLDivElement, unknown>('.d3-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div').attr('class','d3-tooltip') as d3.Selection<HTMLDivElement, unknown, HTMLElement, undefined>;
    }
    tooltipRef.current = tooltip as d3.Selection<HTMLDivElement, unknown, HTMLElement, undefined>;

    // Crosshair overlay
    const overlay = svg.append('rect').attr('width',W).attr('height',H)
      .attr('fill','transparent').attr('pointer-events','all');
    const ig = svg.append('g').attr('class','interaction-group').style('pointer-events','none');
    const vLine = ig.append('line').attr('y1',0).attr('y2',H).attr('stroke','#475569')
      .attr('stroke-width',1.5).attr('stroke-dasharray','4,4').style('opacity',0);
    const hLine = ig.append('line').attr('x1',0).attr('x2',W).attr('stroke','#475569')
      .attr('stroke-width',1.5).attr('stroke-dasharray','4,4').style('opacity',0);

    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx, my] = d3.pointer(event);
      vLine.raise().attr('x1',mx).attr('x2',mx).attr('y1',0).attr('y2',H).style('opacity',1);
      hLine.raise().attr('x1',0).attr('x2',W).attr('y1',my).attr('y2',my).style('opacity',1);
      const currYear = x.invert(mx);
      const yearInt = Math.round(currYear);
      const d = data.find(nd => nd.year === yearInt);
      
      if (d) {
        onHoverRef.current?.(d);
      } else {
        onHoverRef.current?.(null);
      }

      svg.selectAll('.bar').classed('bar-highlight', (nd: any) => nd.year === yearInt);

      if (showTooltip && tooltipRef.current && d) {
        let left = event.pageX + 20;
        if (left + 180 > window.innerWidth) left = event.pageX - 200;
        
        const growthColor = d.growth >= 0 ? '#027a48' : '#b42318';
        const growthPrefix = d.growth > 0 ? '+' : '';

        tooltipRef.current.style('display','block').style('opacity','1')
          .style('position','fixed')
          .style('left',`${left}px`).style('top',`${event.pageY - 40}px`)
          .html(`
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;">
              <span style="color: #667085; font-size: 13px;">Date:</span>
              <span style="font-weight: 700; color: #101828; font-size: 13px;">Dec 31, ${d.year}</span>
              <span style="color: #667085; font-size: 13px;">${config.title}:</span>
              <span style="font-weight: 700; color: #101828; font-size: 13px;">$${d.value.toFixed(1)}B</span>
              <span style="color: ${growthColor}; font-size: 13px;">% YoY:</span>
              <span style="font-weight: 700; color: ${growthColor}; font-size: 13px;">${growthPrefix}${d.growth}%</span>
            </div>
          `);
      }
    }).on('mouseout', () => {
      vLine.style('opacity',0);
      hLine.style('opacity',0);
      svg.selectAll('.bar').classed('bar-highlight', false);
      tooltipRef.current?.style('display','none');
      onHoverRef.current?.(null);
    });
  }, [config, showLabels, showPct, showTooltip, barColor]);

  // Build chart on mount / config change
  useEffect(() => {
    buildChart();
    const handleResize = () => buildChart();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      tooltipRef.current?.remove();
    };
  }, [buildChart]);

  // Play animation
  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
      isPlayingRef.current = false;
      const svg = svgRef.current;
      if (svg) {
        svg.selectAll('.bar').attr('opacity',1);
        svg.selectAll('.bar-label,.growth-label').attr('opacity',1).attr('transform','translate(0,0)');
        svg.selectAll('.play-callout,.play-ring').remove();
      }
      return;
    }

    isPlayingRef.current = true;
    playIndexRef.current = playIndex;
    const data = config.data;
    const svg = svgRef.current;
    const x = xRef.current;
    const y = yRef.current;
    const W = widthRef.current;
    const H = heightRef.current;

    if (!svg || !x || !y) return;

    // Reset or prepare bars
    svg.selectAll('.bar').attr('opacity', 0.08).attr('y', H).attr('height', 0);
    svg.selectAll('.bar-label,.growth-label').attr('opacity', 0);
    svg.selectAll('.play-callout,.play-ring').remove();

    // If starting mid-way, show previous bars immediately
    if (playIndex > 0) {
      svg.selectAll('.bar').filter((_: any, i: number) => i < playIndex)
        .attr('opacity', 1)
        .attr('y', (d: any) => y(d.value))
        .attr('height', (d: any) => H - y(d.value));
      
      if (showLabels) {
        svg.selectAll('.bar-label').filter((_: any, i: number) => i < playIndex)
          .attr('opacity', 1).attr('transform', 'translate(0,0)');
      }
      if (showPct) {
        svg.selectAll('.growth-label').filter((_: any, i: number) => i < playIndex)
          .attr('opacity', 1).attr('transform', 'translate(0,0)');
      }
    }

    const stepMs = Math.floor(4000 / data.length);

    function playStep() {
      const i = playIndexRef.current;
      const d = data[i];
      if (!d || !svgRef.current || !xRef.current || !yRef.current) return;
      const s = svgRef.current, xS = xRef.current, yS = yRef.current;
      const barX = xS(d.year);
      const barY = yS(d.value);
      const rise = Math.round(stepMs * 0.82);
      const lDelay = Math.round(stepMs * 0.35);
      const cDelay = Math.round(stepMs * 0.20);

      s.selectAll('.bar').filter((_: unknown, idx: number) => idx === i)
        .attr('y', H).attr('height', 0).attr('opacity', 0)
        .attr('fill', (nd: unknown) => (nd as {status:string}).status === 'past' ? 'url(#past-gradient)' : 'url(#future-gradient)')
        .transition().duration(rise).ease(d3.easeQuadInOut)
        .attr('y', barY).attr('height', H - barY).attr('opacity', 1);

      s.selectAll('.bar-label').filter((_: unknown, idx: number) => idx === i)
        .attr('opacity', 0).attr('transform', 'translate(0,14)')
        .transition().delay(lDelay).duration(rise).ease(d3.easeQuadInOut)
        .attr('opacity', 1).attr('transform', 'translate(0,0)');

      s.selectAll('.growth-label').filter((_: unknown, idx: number) => idx === i)
        .attr('opacity', 0).attr('transform', 'translate(0,14)')
        .transition().delay(lDelay + 40).duration(rise).ease(d3.easeQuadInOut)
        .attr('opacity', 1).attr('transform', 'translate(0,0)');

      s.selectAll('.play-callout,.play-ring').remove();

      s.append('circle').attr('class', 'play-ring')
        .attr('cx', barX).attr('cy', H).attr('r', 5)
        .attr('fill', 'white').attr('stroke', config.gradients.future.top).attr('stroke-width', 2.5).attr('opacity', 0)
        .transition().duration(rise).ease(d3.easeQuadInOut).attr('cy', barY).attr('opacity', 1)
        .transition().duration(160).ease(d3.easeBackOut).attr('r', 7)
        .transition().duration(140).ease(d3.easeQuadInOut).attr('r', 5);

      const cx = Math.min(Math.max(barX, 54), W - 54);
      const cy = Math.max(barY - 60, 6);
      const gc = d.growth >= 0 ? '#86efac' : '#fca5a5';
      const cg = s.append('g').attr('class', 'play-callout').attr('opacity', 0).attr('transform', 'translate(0,18)');
      cg.append('rect').attr('x', cx - 44).attr('y', cy).attr('width', 88).attr('height', 48).attr('rx', 9)
        .attr('fill', config.gradients.future.top).attr('opacity', 0.96);
      cg.append('text').attr('x', cx).attr('y', cy + 14).attr('text-anchor', 'middle').attr('font-size', '10px')
        .attr('font-weight', '600').attr('fill', 'rgba(255,255,255,0.75)').text(d.year);
      cg.append('text').attr('x', cx).attr('y', cy + 30).attr('text-anchor', 'middle').attr('font-size', '14px')
        .attr('font-weight', '800').attr('fill', '#fff').text(`$${Math.round(d.value)}B`);
      cg.append('text').attr('x', cx).attr('y', cy + 44).attr('text-anchor', 'middle').attr('font-size', '9px')
        .attr('font-weight', '700').attr('fill', gc).text(`${d.growth >= 0 ? '+' : ''}${d.growth}%`);
      cg.append('line').attr('x1', cx).attr('x2', barX).attr('y1', cy + 48).attr('y2', barY - 7)
        .attr('stroke', config.gradients.future.top).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,3').attr('opacity', 0.6);
      cg.transition().delay(cDelay).duration(rise).ease(d3.easeQuadInOut).attr('opacity', 1).attr('transform', 'translate(0,0)');
    }

    playStep();
    playIntervalRef.current = setInterval(() => {
      playIndexRef.current++;
      onPlayStepRef.current?.(playIndexRef.current);
      if (playIndexRef.current >= data.length) {
        clearInterval(playIntervalRef.current!);
        playIntervalRef.current = null;
        const s = svgRef.current;
        if (s) {
          s.selectAll('.bar').attr('opacity', 1);
          s.selectAll('.bar-label,.growth-label').attr('opacity', 1).attr('transform', 'translate(0,0)');
          s.selectAll('.play-callout,.play-ring').transition().duration(500).attr('opacity', 0).remove();
        }
        onPlayFinishRef.current();
      } else {
        playStep();
      }
    }, stepMs);

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, config]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
}
