"use client";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { motion } from "framer-motion";
import type { ExperimentPoint, ProductBreakdown } from "@/lib/mocks/dashboard";

type DashboardMiniChartsProps = {
  experimentsTrend: ExperimentPoint[];
  productBreakdown: ProductBreakdown[];
  metrics: {
    experimentWeek?: number;
    likedTotal?: number;
    dislikedTotal?: number;
    totalImagensGeradas?: number;
    checkoutTotal?: number;
  };
  inlineMode?: boolean;
};

// Cores vibrantes e tecnológicas para o Donut
const DONUT_COLORS = [
  "#4F46E5", // Indigo Forte
  "#D946EF", // Fúcsia/Rosa
  "#F59E0B", // Amber/Laranja
  "#10B981", // Esmeralda
  "#EF4444", // Vermelho
  "#06B6D4", // Ciano
];

export function DashboardMiniCharts({
  experimentsTrend,
  productBreakdown,
  metrics,
  inlineMode = false,
}: DashboardMiniChartsProps) {
  // Validar e preparar dados do gráfico de área
  const trendData = Array.isArray(experimentsTrend) && experimentsTrend.length > 0
    ? experimentsTrend
    : Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          day: date.toLocaleDateString("pt-BR", { weekday: "short" }),
          total: 0,
        };
      });

  // Validar e preparar dados do donut
  const donutData = Array.isArray(productBreakdown) && productBreakdown.length > 0
    ? productBreakdown.slice(0, 3)
    : [];

  // Preparar dados de Aprovação dos Looks
  // IMPORTANTE: Contar apenas imagens que receberam like OU dislike (excluir neutras)
  // Total de likes (ações + composições curtidas)
  const likes = metrics.likedTotal || 0;
  // Total de dislikes (ações + composições rejeitadas)
  const dislikes = metrics.dislikedTotal || 0;
  // Total de imagens com feedback (like OU dislike) = looks gerados válidos
  const looksGerados = likes + dislikes;
  
  // Se não houver feedback, usar o total de imagens geradas como fallback
  const totalImagensGeradas = metrics.totalImagensGeradas || metrics.experimentWeek || 0;
  const looksGeradosValidos = looksGerados > 0 ? looksGerados : totalImagensGeradas;

  const approvalData = [
    {
      name: "Looks Gerados",
      value: looksGeradosValidos,
      color: "#6366F1", // Indigo
      tooltip: "Total de imagens geradas pelo aplicativo da loja",
    },
    {
      name: "Likes",
      value: likes,
      color: "#10B981", // Esmeralda/Verde
      tooltip: "Imagens que receberam like/curtida",
    },
    {
      name: "Deslikes",
      value: dislikes,
      color: "#FB7185", // Rose/Vermelho Suave
      tooltip: "Imagens que receberam dislike/rejeição",
    },
  ];

  // Calcular máximo para o YAxis do bar chart
  const maxValue = Math.max(...approvalData.map(d => d.value), 10);

  // Se inlineMode, retornar os cards diretamente (sem wrapper)
  if (inlineMode) {
    return (
      <>
        {/* Card 1: Fluxo de Acessos (Area Chart) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
          className="bg-white rounded-xl shadow-sm p-4 h-56 animated-card-border"
          style={{ border: '1px solid oklch(67.3% 0.182 276.935)', backgroundColor: 'white' }}
        >
          <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Volume de Experimentações
          </h3>
          <div className="h-[calc(100%-2rem)] min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
              <AreaChart 
                data={trendData} 
                margin={{ top: 10, right: 10, left: 5, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="colorWave" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#818CF8" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="colorWaveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#E2E8F0" 
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={5}
                  width={35}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="url(#colorWave)"
                  strokeWidth={2.5}
                  fill="url(#colorWaveFill)"
                  dot={{ fill: "#6366F1", r: 3, strokeWidth: 2, stroke: "#FFFFFF" }}
                  activeDot={{ 
                    r: 6, 
                    fill: "#6366F1", 
                    strokeWidth: 3, 
                    stroke: "#FFFFFF",
                    style: { filter: "drop-shadow(0 2px 4px rgba(99, 102, 241, 0.4))" }
                  }}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
                <Tooltip
                  cursor={{ stroke: "#94A3B8", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number;
                      return (
                        <div className="rounded-xl bg-white px-4 py-3 shadow-2xl border-2 border-indigo-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {payload[0].payload.day}
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-indigo-600">
                            {value}
                          </p>
                          <p className="text-xs font-medium text-slate-500 mt-1">
                            IMAGES IA
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Card 2: O que eles provam? (Donut Chart) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-4 h-56 animated-card-border"
          style={{ border: '1px solid oklch(67.3% 0.182 276.935)', backgroundColor: 'white' }}
        >
          <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            O que eles provam?
          </h3>
          {donutData.length > 0 ? (
            <div className="h-[calc(100%-2rem)] min-h-[120px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const entry = payload[0].payload as ProductBreakdown;
                        return (
                          <div className="rounded-xl bg-white px-4 py-3 shadow-2xl border-2 border-amber-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color || DONUT_COLORS[0] }}
                              />
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                {entry.name}
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">
                              {payload[0].value}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              provas realizadas
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }}
                    iconType="circle"
                    verticalAlign="bottom"
                    height={35}
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-600">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100%-2rem)]">
              <p className="text-xs text-slate-400">
                Sem dados disponíveis
              </p>
            </div>
          )}
        </motion.div>

        {/* Card 3: Aprovação dos Looks (Bar Chart Horizontal) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-4 h-56 animated-card-border"
          style={{ border: '1px solid oklch(67.3% 0.182 276.935)', backgroundColor: 'white' }}
        >
          <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Aprovação dos Looks
          </h3>
          <div className="h-[calc(100%-2rem)] min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
              <BarChart
                data={approvalData}
                layout="vertical"
                margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#E2E8F0" 
                  horizontal={false}
                  vertical={true}
                  opacity={0.3}
                />
                <XAxis 
                  type="number"
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748B", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Bar
                  dataKey="value"
                  barSize={20}
                  radius={[0, 4, 4, 0]}
                >
                  {approvalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const entry = payload[0].payload as typeof approvalData[0];
                      const percentage = looksGerados > 0 
                        ? Math.round((entry.value / looksGerados) * 100) 
                        : 0;
                      return (
                        <div className="rounded-xl bg-white px-4 py-3 shadow-2xl border-2" style={{ borderColor: entry.color + "40" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {entry.name}
                            </p>
                          </div>
                          <p className="text-2xl font-bold" style={{ color: entry.color }}>
                            {entry.value}
                          </p>
                          {entry.tooltip && (
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              {entry.tooltip}
                            </p>
                          )}
                          {looksGerados > 0 && entry.name !== "Looks Gerados" && (
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              {percentage}% dos looks gerados
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-56">
      {/* Card 1: Fluxo de Acessos (Area Chart) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
        className="bg-white rounded-xl shadow-sm p-4 h-56 animated-card-border"
        style={{ border: '1px solid oklch(67.3% 0.182 276.935)', backgroundColor: 'white' }}
      >
        <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Volume de Experimentações
        </h3>
        <div className="h-[calc(100%-2rem)] min-h-[120px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
            <AreaChart 
              data={trendData} 
              margin={{ top: 10, right: 10, left: 5, bottom: 25 }}
            >
              <defs>
                {/* Gradiente Linear: Roxo Vibrante para Ciano */}
                <linearGradient id="colorWave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.6} />
                  <stop offset="50%" stopColor="#818CF8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.4} />
                </linearGradient>
                {/* Gradiente para o preenchimento */}
                <linearGradient id="colorWaveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                  <stop offset="50%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* Grid lines sutis */}
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E2E8F0" 
                vertical={false}
                opacity={0.5}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickMargin={5}
                width={35}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="url(#colorWave)"
                strokeWidth={2.5}
                fill="url(#colorWaveFill)"
                dot={{ fill: "#6366F1", r: 3, strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ 
                  r: 6, 
                  fill: "#6366F1", 
                  strokeWidth: 3, 
                  stroke: "#FFFFFF",
                  style: { filter: "drop-shadow(0 2px 4px rgba(99, 102, 241, 0.4))" }
                }}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              <Tooltip
                cursor={{ stroke: "#94A3B8", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value as number;
                    return (
                      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl border-2 border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {payload[0].payload.day}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-indigo-600">
                          {value}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          IMAGES IA
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Card 2: O que eles provam? (Donut Chart) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm p-4 h-56 animated-card-border"
        style={{ border: '1px solid oklch(67.3% 0.182 276.935)', backgroundColor: 'white' }}
      >
        <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          O que eles provam?
        </h3>
        {donutData.length > 0 ? (
          <div className="h-[calc(100%-2rem)] min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
              <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const entry = payload[0].payload as ProductBreakdown;
                    return (
                      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl border-2 border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color || DONUT_COLORS[0] }}
                          />
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {entry.name}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-amber-600">
                          {payload[0].value}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          provas realizadas
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
                <Legend
                  wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }}
                  iconType="circle"
                  verticalAlign="bottom"
                  height={35}
                  formatter={(value) => (
                    <span className="text-xs font-medium text-slate-600">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[calc(100%-2rem)]">
            <p className="text-xs text-slate-400">
              Sem dados disponíveis
            </p>
          </div>
        )}
      </motion.div>

      {/* Card 3: Aprovação dos Looks (Bar Chart Horizontal) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm p-4 h-56 animated-card-border"
        style={{ border: '1px solid oklch(67.3% 0.182 276.935)', backgroundColor: 'white' }}
      >
        <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Aprovação dos Looks
        </h3>
        <div className="h-[calc(100%-2rem)] min-h-[120px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
            <BarChart
              data={approvalData}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E2E8F0" 
                horizontal={false}
                vertical={true}
                opacity={0.3}
              />
              <XAxis 
                type="number"
                hide
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#64748B", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Bar
                dataKey="value"
                barSize={20}
                radius={[0, 4, 4, 0]}
              >
                {approvalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const entry = payload[0].payload as typeof approvalData[0];
                    const percentage = looksGerados > 0 
                      ? Math.round((entry.value / looksGerados) * 100) 
                      : 0;
                    return (
                      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl border-2" style={{ borderColor: entry.color + "40" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {entry.name}
                          </p>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: entry.color }}>
                          {entry.value}
                        </p>
                        {entry.tooltip && (
                          <p className="text-xs font-medium text-slate-500 mt-1">
                            {entry.tooltip}
                          </p>
                        )}
                        {looksGerados > 0 && entry.name !== "Looks Gerados" && (
                          <p className="text-xs font-medium text-slate-500 mt-1">
                            {percentage}% dos looks gerados
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
