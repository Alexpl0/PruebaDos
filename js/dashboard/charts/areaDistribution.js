/* === Archivo: js/charts/areaDistribution.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderAreaDistributionChart() {
    const filteredData = getFilteredData();
    const areaData = {};

    filteredData.forEach(item => {
        const area = item.area || 'Unspecified';
        const intExt = item.int_ext || 'Unspecified';
        if (!areaData[area]) {
            areaData[area] = { INTERNAL: 0, EXTERNAL: 0, other: 0 };
        }
        if (intExt.includes('INTERNAL')) {
            areaData[area].INTERNAL++;
        } else if (intExt.includes('EXTERNAL')) {
            areaData[area].EXTERNAL++;
        } else {
            areaData[area].other++;
        }
    });

    const areas = Object.keys(areaData);
    const translatedAreas = areas.map(area => area === 'Sin especificar' ? 'Unspecified' : area);
    const internal = areas.map(area => areaData[area].INTERNAL);
    const external = areas.map(area => areaData[area].EXTERNAL);
    const other = areas.map(area => areaData[area].other);

    // --- ¡NUEVO! Guardar datos para exportación ---
    chartData['areaDistribution'] = {
        title: 'Distribution by Area',
        headers: ['Area', 'Internal Shipments', 'External Shipments', 'Other Shipments'],
        data: translatedAreas.map((area, index) => [
            area,
            internal[index],
            external[index],
            other[index]
        ])
    };

    const options = {
        chart: { type: 'bar', height: 350, stacked: true, id: 'areaDistribution' },
        title: { text: 'Distribution by Area and Type', align: 'left' },
        plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: translatedAreas },
        yaxis: { title: { text: 'Number of Shipments' } },
        fill: { opacity: 1 },
        tooltip: { y: { formatter: val => val + " shipments" } },
        colors: [chartColors.primary, chartColors.secondary, chartColors.neutral],
        series: [
            { name: 'Internal', data: internal },
            { name: 'External', data: external },
            { name: 'Other', data: other }
        ]
    };

    if (charts.areaDistribution) {
        charts.areaDistribution.updateOptions(options);
    } else {
        charts.areaDistribution = new ApexCharts(document.getElementById('chartAreaDistribution'), options);
        charts.areaDistribution.render();
    }
}
