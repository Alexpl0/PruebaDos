/* === Archivo: js/charts/cost.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

export function renderCostCategoriesChart() {
    const filteredData = getFilteredData();
    const costCategories = { "≤ €1,500": 0, "€1,501 - €5,000": 0, "€5,001 - €10,000": 0, "> €10,000": 0 };
    
    filteredData.forEach(item => {
        const cost = parseFloat(item.cost_euros || 0);
        if (cost <= 1500) costCategories["≤ €1,500"]++;
        else if (cost <= 5000) costCategories["€1,501 - €5,000"]++;
        else if (cost <= 10000) costCategories["€5,001 - €10,000"]++;
        else costCategories["> €10,000"]++;
    });

    const labels = Object.keys(costCategories);
    const series = Object.values(costCategories);

    // --- ¡NUEVO! Guardar datos para exportación ---
    chartData['costCategories'] = {
        title: 'Cost Categories',
        headers: ['Cost Category', 'Number of Shipments'],
        data: labels.map((label, index) => [label, series[index]])
    };

    const options = {
        chart: { type: 'donut', height: 350, id: 'costCategories' },
        title: { text: 'Cost Categories', align: 'left' },
        labels: labels,
        series: series,
        colors: ['#4CAF50', '#FFB74D', '#FF7043', '#E53935'],
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0) } } } } },
        legend: { position: 'bottom' }
    };

    if (charts.costCategories) {
        charts.costCategories.updateOptions(options);
    } else {
        charts.costCategories = new ApexCharts(document.getElementById('chartCostCategories'), options);
        charts.costCategories.render();
    }
}

export function renderPaidByChart() {
    const filteredData = getFilteredData();
    const paidByData = {};
    const costByPayer = {};

    const translations = { 'Sin especificar': 'Unspecified', 'Cliente': 'Customer', 'Proveedor': 'Supplier', 'Interno': 'Internal' };

    filteredData.forEach(item => {
        const paidByRaw = item.paid_by || 'Sin especificar';
        const paidBy = translations[paidByRaw] || paidByRaw;
        const cost = parseFloat(item.cost_euros || 0);

        paidByData[paidBy] = (paidByData[paidBy] || 0) + 1;
        costByPayer[paidBy] = (costByPayer[paidBy] || 0) + cost;
    });

    const labels = Object.keys(paidByData);
    const series = Object.values(paidByData);

    // --- ¡NUEVO! Guardar datos para exportación ---
    chartData['paidBy'] = {
        title: 'Payment Responsibility',
        headers: ['Payer', 'Number of Shipments', 'Total Cost (€)'],
        data: labels.map(label => [
            label,
            paidByData[label],
            costByPayer[label].toFixed(2)
        ])
    };

    const options = {
        chart: { type: 'pie', height: 300, id: 'paidBy' },
        title: { text: 'Payment Responsibility', align: 'left' },
        labels: labels,
        series: series,
        colors: chartColors.palette,
        legend: { position: 'bottom' }
    };

    if (charts.paidBy) {
        charts.paidBy.updateOptions(options);
    } else {
        charts.paidBy = new ApexCharts(document.getElementById('chartPaidBy'), options);
        charts.paidBy.render();
    }
    
    // Render stats table
    const paidByStats = document.getElementById('paidByStats');
    if (paidByStats) {
        let statsHTML = '<ul class="list-group">';
        for (const [payer, cost] of Object.entries(costByPayer)) {
            statsHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${payer}<span class="badge bg-primary rounded-pill">€${formatNumber(cost, 0)}</span></li>`;
        }
        statsHTML += '</ul>';
        paidByStats.innerHTML = statsHTML;
    }
}
