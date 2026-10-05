"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

export interface AnalyticsChartItem {
  id: string;
  title: string;
  totalRevenue: number;
  totalTickets: number;
  daily: Array<{
    date: string;
    dayName: string;
    dayShort: string;
    displayDate: string;
    tickets: number;
    revenue: number;
    showtimesCount: number;
  }>;
}

interface MovieAnalyticsChartProps {
  dailyTotals: Array<{
    date: string;
    dayName: string;
    dayShort: string;
    displayDate: string;
    totalTickets: number;
    totalRevenue: number;
    totalShowtimes: number;
  }>;
  items: AnalyticsChartItem[];
  activeMetric: "tickets" | "revenue";
  chartType: "line" | "bar";
  selectedItemId: string | "ALL";
  onSelectItem?: (id: string | "ALL") => void;
  allLabel?: string;
}

const COLOR_PALETTE = [
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#E11D48", // Rose
  "#3B82F6", // Blue
  "#84CC16", // Lime
  "#A855F7", // Purple 500
];

export default function MovieAnalyticsChart({
  dailyTotals,
  items,
  activeMetric,
  chartType,
  selectedItemId,
  onSelectItem,
  allLabel = "Semua",
}: MovieAnalyticsChartProps) {
  const { formatCurrency, formatNumber, t } = useTranslation();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Assign color mapping per item
  const itemColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((item, index) => {
      map[item.id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return map;
  }, [items]);

  // Filtered items to display
  const displayItems = useMemo(() => {
    if (selectedItemId === "ALL") {
      return items;
    }
    return items.filter((m) => m.id === selectedItemId);
  }, [items, selectedItemId]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !dailyTotals.length) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = 400;
    const margin = { top: 30, right: 30, bottom: 45, left: activeMetric === "revenue" ? 85 : 55 };
    const innerWidth = Math.max(width - margin.left - margin.right, 200);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 150);

    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
    const textColor = isDark ? "#94A3B8" : "#64748B";

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", height);

    // Defs for gradients & shadow filters
    const defs = svg.append("defs");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create linear gradients for area fills under lines
    items.forEach((item) => {
      const color = itemColorMap[item.id] || "#6366F1";
      const gradient = defs
        .append("linearGradient")
        .attr("id", `area-grad-${item.id}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

      gradient.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.35);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0.0);
    });

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale (Dates)
    const dates = dailyTotals.map((d) => d.date);
    const dateLabels: Record<string, string> = {};
    dailyTotals.forEach((d) => {
      dateLabels[d.date] = `${d.dayShort} ${d.displayDate.split(" ")[0]}`;
    });

    const xScale = d3.scalePoint().domain(dates).range([0, innerWidth]).padding(0.35);

    // Y Max calculation
    let yMax = 0;
    if (chartType === "line") {
      if (selectedItemId === "ALL") {
        displayItems.forEach((m) => {
          m.daily.forEach((d) => {
            const val = activeMetric === "revenue" ? d.revenue : d.tickets;
            if (val > yMax) yMax = val;
          });
        });
      } else {
        const targetItem = items.find((m) => m.id === selectedItemId);
        targetItem?.daily.forEach((d) => {
          const val = activeMetric === "revenue" ? d.revenue : d.tickets;
          if (val > yMax) yMax = val;
        });
      }
    } else {
      // Bar chart
      displayItems.forEach((m) => {
        m.daily.forEach((d) => {
          const val = activeMetric === "revenue" ? d.revenue : d.tickets;
          if (val > yMax) yMax = val;
        });
      });
    }

    // Add 15% headroom
    yMax = Math.max(yMax * 1.15, activeMetric === "revenue" ? 100000 : 10);

    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

    // Horizontal grid lines
    const yTicks = yScale.ticks(5);
    g.append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", gridColor)
      .attr("stroke-dasharray", "4,4");

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => dateLabels[d as string] || (d as string))
      .tickSize(0)
      .tickPadding(12);

    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisG.select(".domain").attr("stroke", gridColor);
    xAxisG.selectAll("text").attr("fill", textColor).attr("font-size", "12px").attr("font-weight", "500");

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat((d) => {
        const num = d as number;
        if (activeMetric === "revenue") {
          if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}M`;
          if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}Jt`;
          if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
          return `${num}`;
        }
        return `${num}`;
      });

    const yAxisG = g.append("g").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG.selectAll("text").attr("fill", textColor).attr("font-size", "12px").attr("font-weight", "500");

    // Tooltip reference
    const tooltip = d3.select(tooltipRef.current);

    // ==========================================
    // RENDER LINE CHART
    // ==========================================
    if (chartType === "line") {
      const lineGen = d3
        .line<{ date: string; value: number }>()
        .x((d) => xScale(d.date) || 0)
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const areaGen = d3
        .area<{ date: string; value: number }>()
        .x((d) => xScale(d.date) || 0)
        .y0(innerHeight)
        .y1((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      displayItems.forEach((item) => {
        const itemColor = itemColorMap[item.id] || "#6366F1";
        const seriesData = item.daily.map((d) => ({
          date: d.date,
          value: activeMetric === "revenue" ? d.revenue : d.tickets,
        }));

        const isDimmed =
          hoveredItemId !== null && hoveredItemId !== item.id;
        const isHighlighted = hoveredItemId === item.id;

        // Area Fill (only when single item or highlighted)
        if (displayItems.length === 1 || isHighlighted) {
          g.append("path")
            .datum(seriesData)
            .attr("fill", `url(#area-grad-${item.id})`)
            .attr("d", areaGen)
            .attr("opacity", isDimmed ? 0.05 : 0.8)
            .style("transition", "opacity 0.2s ease");
        }

        // Line Stroke
        g.append("path")
          .datum(seriesData)
          .attr("fill", "none")
          .attr("stroke", itemColor)
          .attr("stroke-width", isHighlighted ? 3.5 : displayItems.length === 1 ? 3 : 2.5)
          .attr("d", lineGen)
          .attr("opacity", isDimmed ? 0.15 : 1)
          .style("transition", "all 0.2s ease")
          .style("cursor", "pointer")
          .on("mouseenter", () => setHoveredItemId(item.id))
          .on("mouseleave", () => setHoveredItemId(null));

        // Data dots
        g.selectAll(`.dot-${item.id}`)
          .data(seriesData)
          .enter()
          .append("circle")
          .attr("class", `dot-${item.id}`)
          .attr("cx", (d) => xScale(d.date) || 0)
          .attr("cy", (d) => yScale(d.value))
          .attr("r", isHighlighted ? 5.5 : 4)
          .attr("fill", isDark ? "#09090b" : "#ffffff")
          .attr("stroke", itemColor)
          .attr("stroke-width", 2.5)
          .attr("opacity", isDimmed ? 0.15 : 1)
          .style("transition", "all 0.2s ease")
          .style("cursor", "pointer")
          .on("mouseenter", () => setHoveredItemId(item.id))
          .on("mouseleave", () => setHoveredItemId(null));
      });

      // Hover Crosshair vertical bar & multi-item tooltip tracker
      const crosshair = g
        .append("line")
        .attr("class", "crosshair")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", isDark ? "#A1A1AA" : "#71717A")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "3,3")
        .style("opacity", 0)
        .style("pointer-events", "none");

      // Overlay for tracking pointer position
      const overlay = g
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .style("cursor", "crosshair");

      overlay
        .on("mousemove", (event) => {
          const [mouseX] = d3.pointer(event);
          // Find closest date point
          let closestDate = dates[0];
          let minDist = Infinity;
          dates.forEach((d) => {
            const xPos = xScale(d) || 0;
            const dist = Math.abs(xPos - mouseX);
            if (dist < minDist) {
              minDist = dist;
              closestDate = d;
            }
          });

          const currentX = xScale(closestDate) || 0;
          crosshair.attr("x1", currentX).attr("x2", currentX).style("opacity", 1);

          const dayInfo = dailyTotals.find((dt) => dt.date === closestDate);
          if (!dayInfo) return;

          // Tooltip content
          const itemRows = displayItems
            .map((m) => {
              const dailyEntry = m.daily.find((d) => d.date === closestDate);
              const val = activeMetric === "revenue" ? dailyEntry?.revenue || 0 : dailyEntry?.tickets || 0;
              const color = itemColorMap[m.id] || "#6366F1";
              return {
                id: m.id,
                title: m.title,
                color,
                val,
                formatted: activeMetric === "revenue" ? formatCurrency(val) : `${formatNumber(val)} tiket`,
              };
            })
            .sort((a, b) => b.val - a.val);

          const totalForDay =
            activeMetric === "revenue"
              ? formatCurrency(dayInfo.totalRevenue)
              : `${formatNumber(dayInfo.totalTickets)} tiket`;

          tooltip
            .style("display", "block")
            .style("left", `${event.clientX + 15}px`)
            .style("top", `${event.clientY - 40}px`).html(`
              <div class="p-3 bg-zinc-900/95 dark:bg-zinc-950/95 text-white backdrop-blur-md rounded-2xl shadow-xl border border-zinc-700/50 text-xs min-w-[210px] space-y-2">
                <div class="flex items-center justify-between border-b border-zinc-700/60 pb-1.5 font-semibold">
                  <span class="text-indigo-400">${dayInfo.dayName}, ${dayInfo.displayDate}</span>
                  <span class="text-zinc-300 font-bold">${totalForDay}</span>
                </div>
                <div class="space-y-1.5 max-h-48 overflow-y-auto">
                  ${itemRows
                    .map(
                      (row) => `
                    <div class="flex items-center justify-between gap-3 ${hoveredItemId === row.id ? "bg-zinc-800/80 p-1 rounded-lg" : ""}">
                      <div class="flex items-center gap-2 truncate max-w-[130px]">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${row.color}"></span>
                        <span class="truncate text-zinc-200">${row.title}</span>
                      </div>
                      <span class="font-bold text-white shrink-0">${row.formatted}</span>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `);
        })
        .on("mouseleave", () => {
          crosshair.style("opacity", 0);
          tooltip.style("display", "none");
        });
    }

    // ==========================================
    // RENDER BAR CHART (Grouped Bars)
    // ==========================================
    if (chartType === "bar") {
      const xGroupScale = d3.scaleBand().domain(dates).range([0, innerWidth]).padding(0.2);

      const itemIds = displayItems.map((m) => m.id);
      const xSubgroupScale = d3
        .scaleBand()
        .domain(itemIds)
        .range([0, xGroupScale.bandwidth()])
        .padding(0.08);

      const dateGroups = g
        .selectAll(".date-group")
        .data(dailyTotals)
        .enter()
        .append("g")
        .attr("class", "date-group")
        .attr("transform", (d) => `translate(${xGroupScale(d.date)},0)`);

      displayItems.forEach((item) => {
        const itemColor = itemColorMap[item.id] || "#6366F1";
        const isDimmed = hoveredItemId !== null && hoveredItemId !== item.id;
        const isHighlighted = hoveredItemId === item.id;

        dateGroups
          .append("rect")
          .attr("x", () => xSubgroupScale(item.id) || 0)
          .attr("y", (d) => {
            const dailyEntry = item.daily.find((mDaily) => mDaily.date === d.date);
            const val = activeMetric === "revenue" ? dailyEntry?.revenue || 0 : dailyEntry?.tickets || 0;
            return yScale(val);
          })
          .attr("width", xSubgroupScale.bandwidth())
          .attr("height", (d) => {
            const dailyEntry = item.daily.find((mDaily) => mDaily.date === d.date);
            const val = activeMetric === "revenue" ? dailyEntry?.revenue || 0 : dailyEntry?.tickets || 0;
            return Math.max(innerHeight - yScale(val), 0);
          })
          .attr("rx", 4)
          .attr("fill", itemColor)
          .attr("opacity", isDimmed ? 0.2 : isHighlighted ? 1 : 0.85)
          .style("transition", "all 0.2s ease")
          .style("cursor", "pointer")
          .on("mouseenter", (event, d) => {
            setHoveredItemId(item.id);
            const dailyEntry = item.daily.find((mDaily) => mDaily.date === d.date);
            const val = activeMetric === "revenue" ? dailyEntry?.revenue || 0 : dailyEntry?.tickets || 0;
            const formatted = activeMetric === "revenue" ? formatCurrency(val) : `${formatNumber(val)} tiket`;

            tooltip
              .style("display", "block")
              .style("left", `${event.clientX + 15}px`)
              .style("top", `${event.clientY - 30}px`).html(`
                <div class="p-3 bg-zinc-900/95 dark:bg-zinc-950/95 text-white backdrop-blur-md rounded-2xl shadow-xl border border-zinc-700/50 text-xs space-y-1.5">
                  <div class="text-indigo-400 font-semibold">${d.dayName}, ${d.displayDate}</div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${itemColor}"></span>
                    <span class="font-bold text-white">${item.title}</span>
                  </div>
                  <div class="text-zinc-300 font-medium">
                    ${activeMetric === "revenue" ? "Pendapatan" : "Tiket"}: <span class="font-bold text-white">${formatted}</span>
                  </div>
                  <div class="text-zinc-400 text-[11px]">
                    ${dailyEntry?.showtimesCount || 0} sesi penayangan
                  </div>
                </div>
              `);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", `${event.clientX + 15}px`).style("top", `${event.clientY - 30}px`);
          })
          .on("mouseleave", () => {
            setHoveredItemId(null);
            tooltip.style("display", "none");
          });
      });
    }
  }, [
    dailyTotals,
    items,
    activeMetric,
    chartType,
    selectedItemId,
    displayItems,
    itemColorMap,
    hoveredItemId,
    theme,
    formatCurrency,
    formatNumber,
  ]);

  return (
    <div className="space-y-4">
      {/* Chart SVG Container */}
      <div ref={containerRef} className="w-full relative min-h-[400px]">
        <svg ref={svgRef} className="w-full h-auto overflow-visible select-none" />
        {/* Floating Tooltip */}
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-50 transition-all duration-75"
          style={{ display: "none" }}
        />
      </div>

      {/* Interactive Legend Badges */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {t("analytics.legendHelp")}
          </p>
          {onSelectItem && selectedItemId !== "ALL" && (
            <button
              onClick={() => onSelectItem("ALL")}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              ← {allLabel}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const color = itemColorMap[item.id] || "#6366F1";
            const isSelected = selectedItemId === item.id || selectedItemId === "ALL";
            const isHovered = hoveredItemId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem && onSelectItem(selectedItemId === item.id ? "ALL" : item.id)}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                  isHovered || (selectedItemId === item.id && selectedItemId !== "ALL")
                    ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-xs scale-105"
                    : isSelected
                    ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    : "opacity-40 bg-zinc-50 dark:bg-zinc-900/40 border-transparent"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 max-w-[140px] truncate">
                  {item.title}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">
                  {activeMetric === "revenue"
                    ? formatCurrency(item.totalRevenue)
                    : `${formatNumber(item.totalTickets)} tkt`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
