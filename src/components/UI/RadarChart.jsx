import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const CustomRadarChart = ({ data, keys, colors }) => {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 10]}
                        tick={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px'
                        }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />

                    {/* User Profile Radar */}
                    <Radar
                        name="Mon Profil"
                        dataKey="user"
                        stroke="#ffffff"
                        strokeWidth={3}
                        fill="#ffffff"
                        fillOpacity={0.1}
                    />

                    {/* School Radars */}
                    {keys.map((key) => (
                        <Radar
                            key={key.id}
                            name={key.name}
                            dataKey={key.id}
                            stroke={colors[key.id]}
                            strokeWidth={2}
                            fill={colors[key.id]}
                            fillOpacity={0.3}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CustomRadarChart;
