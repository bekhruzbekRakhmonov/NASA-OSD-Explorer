import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Sector } from 'recharts';

interface Message {
  text: string;
  isUser: boolean;
}

interface ChartSuggestion {
  type: string;
  x_axis: string;
  y_axis: string;
  title: string;
}

const missionData = [
  { year: 2020, missions379: 5, dataCollected379: 1000, missions665: 4, dataCollected665: 800 },
  { year: 2021, missions379: 7, dataCollected379: 1500, missions665: 6, dataCollected665: 1200 },
  { year: 2022, missions379: 10, dataCollected379: 2200, missions665: 9, dataCollected665: 2000 },
  { year: 2023, missions379: 12, dataCollected379: 3000, missions665: 11, dataCollected665: 2800 },
  { year: 2024, missions379: 15, dataCollected379: 3800, missions665: 14, dataCollected665: 3600 },
];

const researchFocusData379 = [
  { name: 'Exoplanet Detection', value: 35 },
  { name: 'Solar System Exploration', value: 25 },
  { name: 'Dark Matter Research', value: 20 },
  { name: 'Galactic Structure', value: 20 },
];

const researchFocusData665 = [
  { name: 'Exoplanet Detection', value: 30 },
  { name: 'Solar System Exploration', value: 20 },
  { name: 'Dark Matter Research', value: 25 },
  { name: 'Galactic Structure', value: 25 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const App: React.FC = () => {
  const [sessionId] = useState<string>(uuidv4());
  const [query, setQuery] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    { text: "Welcome to the NASA Research Dashboard! You can ask questions about OSD-379 and OSD-665 research programs.", isUser: false },
    { text: "Can you compare the missions and data collected for OSD-379 and OSD-665?", isUser: true },
    { text: "Certainly! Let's compare the missions and data collected for OSD-379 and OSD-665 over the years:\n\n" +
      "2020:\n" +
      "- OSD-379: 5 missions, 1000 TB data collected\n" +
      "- OSD-665: 4 missions, 800 TB data collected\n\n" +
      "2021:\n" +
      "- OSD-379: 7 missions, 1500 TB data collected\n" +
      "- OSD-665: 6 missions, 1200 TB data collected\n\n" +
      "2022:\n" +
      "- OSD-379: 10 missions, 2200 TB data collected\n" +
      "- OSD-665: 9 missions, 2000 TB data collected\n\n" +
      "2023:\n" +
      "- OSD-379: 12 missions, 3000 TB data collected\n" +
      "- OSD-665: 11 missions, 2800 TB data collected\n\n" +
      "2024:\n" +
      "- OSD-379: 15 missions, 3800 TB data collected\n" +
      "- OSD-665: 14 missions, 3600 TB data collected\n\n" +
      "Overall, OSD-379 has consistently had slightly more missions and collected more data than OSD-665, but the gap between them has remained relatively small.", isUser: false },
    { text: "What are the main differences in research focus between OSD-379 and OSD-665?", isUser: true },
    { text: "The main differences in research focus between OSD-379 and OSD-665 are:\n\n" +
      "1. Exoplanet Detection:\n" +
      "   - OSD-379: 35%\n" +
      "   - OSD-665: 30%\n" +
      "   OSD-379 has a slightly higher focus on exoplanet detection.\n\n" +
      "2. Solar System Exploration:\n" +
      "   - OSD-379: 25%\n" +
      "   - OSD-665: 20%\n" +
      "   OSD-379 puts more emphasis on solar system exploration.\n\n" +
      "3. Dark Matter Research:\n" +
      "   - OSD-379: 20%\n" +
      "   - OSD-665: 25%\n" +
      "   OSD-665 has a higher focus on dark matter research.\n\n" +
      "4. Galactic Structure:\n" +
      "   - OSD-379: 20%\n" +
      "   - OSD-665: 25%\n" +
      "   OSD-665 puts more emphasis on galactic structure studies.\n\n" +
      "In summary, while both programs cover the same research areas, OSD-379 leans more towards exoplanet detection and solar system exploration, while OSD-665 has a slightly higher focus on dark matter research and galactic structure studies.", isUser: false },
  ]);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [matplotlibCode, setMatplotlibCode] = useState<string | null>(null);
  const [suggestedCharts, setSuggestedCharts] = useState<ChartSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSuggestedCharts();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const fetchSuggestedCharts = async () => {
    try {
      const response = await axios.get<{ suggested_charts: ChartSuggestion[] }>(
        "http://localhost:8000/suggest_charts"
      );
      console.log("Suggested charts:", response.data.suggested_charts);
      setSuggestedCharts(response.data.suggested_charts);
    } catch (error) {
      console.error("Error fetching suggested charts:", error);
      setError("Failed to fetch suggested charts. Please try again.");
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { text: query, isUser: true },
    ]);
    setQuery("");
    setIsTyping(true);

    try {
      const response = await axios.post<{ response: string }>(
        "http://localhost:8000/query",
        { text: query, session_id: sessionId }
      );
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: response.data.response, isUser: false },
      ]);
    } catch (error) {
      console.error("Error querying data:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `Error: ${error.response.status} - ${error.response.data.detail || error.message}`;
      }
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: errorMessage, isUser: false },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateChart = async (chartSuggestion: ChartSuggestion) => {
    setError(null);
    setChartImage(null);
    setMatplotlibCode(null);
    setIsTyping(true);
    
    try {
      console.log("Generating chart with suggestion:", chartSuggestion);
      const response = await axios.post<{ chart_data: string; matplotlib_code: string }>(
        "http://localhost:8000/generate_chart",
        chartSuggestion
      );
      console.log("Received chart data:", response.data);
      
      if (response.data.chart_data) {
        setChartImage(`data:image/png;base64,${response.data.chart_data}`);
      } else {
        setError("Received empty chart data from the server.");
      }
      
      setMatplotlibCode(response.data.matplotlib_code);
    } catch (error) {
      console.error("Error generating chart:", error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Error generating chart: ${error.response.status} - ${error.response.data.detail || error.message}`);
      } else {
        setError("Failed to generate chart. Please try again.");
      }
    } finally {
      setIsTyping(false);
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 text-gray-400">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
    </div>
  );

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`Value ${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Chat Section */}
      <div className="w-1/2 p-6 flex flex-col border-r border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">NASA Research Chat</h1>
        <div className="flex-grow overflow-auto mb-6 rounded-lg bg-gray-800 p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 p-3 rounded-lg ${
                message.isUser ? "bg-blue-600 ml-auto" : "bg-gray-700"
              } max-w-3/4`}
            >
              {message.isUser ? (
                message.text
              ) : (
                <ReactMarkdown
                components={{
                  code({inline, className, children, ...props}: {inline?: boolean, className?: string, children?: React.ReactNode}) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                        <SyntaxHighlighter
                          style={atomDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="mb-4 p-3 rounded-lg bg-gray-700 max-w-3/4">
              <TypingIndicator />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ minHeight: '70px' }} className="flex bg-gray-800 rounded-lg overflow-hidden">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleQuery()}
            placeholder="Ask about NASA OSD-379 and OSD-665 research..."
            className="flex-grow bg-transparent p-3 focus:outline-none"
            disabled={isTyping}
          />
          <button
            onClick={handleQuery}
            className={`bg-blue-500 text-white px-6 py-3 transition-colors ${
              isTyping ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
            disabled={isTyping}
          >
            Send
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-1/2 p-6 flex flex-col">
        <h1 className="text-3xl font-bold mb-6 text-green-400">NASA Research Data Visualization</h1>
        <div className="mb-6 grid grid-cols-2 gap-4">
          {suggestedCharts.map((chart, index) => (
            <button
              key={index}
              onClick={() => handleGenerateChart(chart)}
              className={`bg-green-600 text-white p-3 rounded-lg transition-colors ${
                isTyping ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
              disabled={isTyping}
            >
              {chart.title}
            </button>
          ))}
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded-lg">
            {error}
          </div>
        )}
        {chartImage ? (
          <div className="flex-grow bg-gray-800 rounded-lg p-4 overflow-auto">
            <img src={chartImage} alt="Generated Chart" className="w-full h-auto" />
            {matplotlibCode && (
              <div className="mt-4">
                <h2 className="text-xl font-bold mb-2">Matplotlib Code:</h2>
                <SyntaxHighlighter language="python" style={atomDark}>
                  {matplotlibCode}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-grow bg-gray-800 rounded-lg p-4 overflow-auto">
            <h2 className="text-xl font-bold mb-4">NASA Research Interactive Charts</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bar Chart: Missions Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={missionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="missions379" fill="#8884d8" name="OSD-379 Missions" />
                    <Bar dataKey="missions665" fill="#82ca9d" name="OSD-665 Missions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Line Chart: Data Collection Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={missionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="dataCollected379" stroke="#8884d8" name="OSD-379 Data Collected (TB)" />
                    <Line type="monotone" dataKey="dataCollected665" stroke="#82ca9d" name="OSD-665 Data Collected (TB)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between">
                <div className="w-1/2 pr-2">
                  <h3 className="text-lg font-semibold mb-2">Pie Chart: OSD-379 Research Focus</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={researchFocusData379}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                      >
                        {researchFocusData379.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 pl-2">
                  <h3 className="text-lg font-semibold mb-2">Pie Chart: OSD-665 Research Focus</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={researchFocusData665}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                      >
                        {researchFocusData665.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;