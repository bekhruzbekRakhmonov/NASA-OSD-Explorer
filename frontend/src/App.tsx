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
  { year: 2020, missions: 5, dataCollected: 1000 },
  { year: 2021, missions: 7, dataCollected: 1500 },
  { year: 2022, missions: 10, dataCollected: 2200 },
  { year: 2023, missions: 12, dataCollected: 3000 },
  { year: 2024, missions: 15, dataCollected: 3800 },
];

const researchFocusData = [
  { name: 'Exoplanet Detection', value: 35 },
  { name: 'Solar System Exploration', value: 25 },
  { name: 'Dark Matter Research', value: 20 },
  { name: 'Galactic Structure', value: 20 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const App: React.FC = () => {
  const [sessionId] = useState<string>(uuidv4());
  const [query, setQuery] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
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
        <h1 className="text-3xl font-bold mb-6 text-blue-400">NASA OSD-379 Research Chat</h1>
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
                    code({node, inline, className, children, ...props}) {
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
        <div className="flex bg-gray-800 rounded-lg overflow-hidden">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleQuery()}
            placeholder="Ask about NASA OSD-379 research..."
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
        <h1 className="text-3xl font-bold mb-6 text-green-400">NASA OSD-379 Data Visualization</h1>
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
            <h2 className="text-xl font-bold mb-4">NASA OSD-379 Interactive Charts</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bar Chart: Missions and Data Collected</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={missionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="missions" fill="#8884d8" name="Missions" />
                    <Bar yAxisId="right" dataKey="dataCollected" fill="#82ca9d" name="Data Collected (TB)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Line Chart: Mission Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={missionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="missions" stroke="#8884d8" activeDot={{ r: 8 }} name="Missions" />
                    <Line type="monotone" dataKey="dataCollected" stroke="#82ca9d" name="Data Collected (TB)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
			  <h3 className="text-lg font-semibold mb-2">Pie Chart: Research Focus Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={researchFocusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                    >
                      {researchFocusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;