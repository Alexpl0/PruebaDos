/* === Archivo: js/charts/approval.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderApprovalTimeChart() {
    const filteredData = getFilteredData();
    const approvalTimeData = [];

    filteredData.forEach(item => {
        if (item.date && item.approval_date && item.status_name) {
            const createDate = new Date(item.date);
            const approvalDate = new Date(item.approval_date);
            const diffTime = Math.abs(approvalDate - createDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            approvalTimeData.push({ id: item.id, days: diffDays, status: item.status_name });
        }
    });

    const avgByStatus = {};
    const countByStatus = {};
    approvalTimeData.forEach(item => {
        if (!avgByStatus[item.status]) {
            avgByStatus[item.status] = 0;
            countByStatus[item.status] = 0;
        }
        avgByStatus[item.status] += item.days;
        countByStatus[item.status]++;
    });

    for (const status in avgByStatus) {
        avgByStatus[status] = avgByStatus[status] / countByStatus[status];
    }

    const statusTranslation = { 'nuevo': 'New', 'revision': 'In Review', 'aprobado': 'Approved', 'rechazado': 'Rejected' };
    const statusOrder = ['New', 'In Review', 'Approved', 'Rejected'];
    const categories = [];
    const seriesData = [];

    statusOrder.forEach(status => {
        const originalStatus = Object.keys(statusTranslation).find(key => statusTranslation[key] === status);
        if (avgByStatus[originalStatus] !== undefined) {
            categories.push(status);
            seriesData.push(avgByStatus[originalStatus]);
        }
    });

    // --- ¡NUEVO! Guardar datos para exportación ---
    chartData['approvalTime'] = {
        title: 'Average Approval Time',
        headers: ['Status', 'Average Time (Days)'],
        data: categories.map((status, index) => [
            status,
            seriesData[index].toFixed(2)
        ])
    };

    const options = {
        chart: { type: 'bar', height: 350, id: 'approvalTime' },
        title: { text: 'Average Approval Time', align: 'left' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        dataLabels: { enabled: true, formatter: val => val.toFixed(1) + ' days' },
        xaxis: { categories: categories, title: { text: 'Average Time (Days)' } },
        colors: [chartColors.primary],
        series: [{ name: 'Average Days', data: seriesData }]
    };

    if (charts.approvalTime) {
        charts.approvalTime.updateOptions(options);
    } else {
        charts.approvalTime = new ApexCharts(document.getElementById('chartApprovalTime'), options);
        charts.approvalTime.render();
    }
}
