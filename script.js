document.addEventListener('DOMContentLoaded', () => {
    // Element selectors
    const themeToggle = document.getElementById('theme-toggle');
    const expenseForm = document.getElementById('expense-form');
    const expensesList = document.getElementById('expenses-list');
    const categoryChartCanvas = document.getElementById('category-chart').getContext('2d');
    const monthlyChartCanvas = document.getElementById('monthly-chart').getContext('2d');
    const exportCsvButton = document.getElementById('export-csv');
    const filterCategory = document.getElementById('filter-category');
    const filterMonth = document.getElementById('filter-month');
    const clearFiltersButton = document.getElementById('clear-filters');

    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    let pieChart;
    let monthlyChart;

    // --- THEME ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });

    // --- RENDERING ---
    const renderExpenses = (expensesToRender) => {
        expensesList.innerHTML = '';
        if (expensesToRender.length === 0) {
            expensesList.innerHTML = '<tr><td colspan="5">No matching expenses.</td></tr>';
            return;
        }
        expensesToRender.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>$${expense.amount.toFixed(2)}</td>
                <td>${expense.category}</td>
                <td>${expense.date}</td>
                <td>${expense.note}</td>
                <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
            `;
            expensesList.appendChild(row);
        });
    };

    const updatePieChart = (expensesToRender) => {
        const categoryData = expensesToRender.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        const chartData = {
            labels: Object.keys(categoryData),
            datasets: [{
                label: 'Expenses by Category',
                data: Object.values(categoryData),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
            }]
        };

        if (pieChart) pieChart.destroy();
        pieChart = new Chart(categoryChartCanvas, {
            type: 'pie',
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    const updateMonthlyChart = (expensesToRender) => {
        const monthlyData = expensesToRender.reduce((acc, expense) => {
            const month = expense.date.substring(0, 7); // YYYY-MM
            acc[month] = (acc[month] || 0) + expense.amount;
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        const chartData = {
            labels: sortedMonths,
            datasets: [{
                label: 'Monthly Spending',
                data: sortedMonths.map(month => monthlyData[month]),
                borderColor: '#4BC0C0',
                tension: 0.1,
                fill: false
            }]
        };

        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(monthlyChartCanvas, {
            type: 'line',
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false }
        });
    };


    // --- FILTERING ---
    const applyFilters = () => {
        const categoryValue = filterCategory.value.toLowerCase();
        const monthValue = filterMonth.value; // YYYY-MM

        let filteredExpenses = expenses;

        if (categoryValue) {
            filteredExpenses = filteredExpenses.filter(e => e.category.toLowerCase().includes(categoryValue));
        }

        if (monthValue) {
            filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(monthValue));
        }

        return filteredExpenses;
    };

    const renderAll = () => {
        const filteredExpenses = applyFilters();
        renderExpenses(filteredExpenses);
        updatePieChart(filteredExpenses);
        updateMonthlyChart(filteredExpenses);
    };

    filterCategory.addEventListener('input', renderAll);
    filterMonth.addEventListener('input', renderAll);
    clearFiltersButton.addEventListener('click', () => {
        filterCategory.value = '';
        filterMonth.value = '';
        renderAll();
    });

    // --- CRUD OPERATIONS ---
    expenseForm.addEventListener('submit', e => {
        e.preventDefault();
        const newExpense = {
            id: Date.now(),
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            note: document.getElementById('note').value
        };

        if (!newExpense.amount || !newExpense.category || !newExpense.date) {
            alert('Please fill in all required fields.');
            return;
        }

        expenses.push(newExpense);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        renderAll();
        expenseForm.reset();
    });

    expensesList.addEventListener('click', e => {
        if (e.target.classList.contains('delete-btn')) {
            const id = parseInt(e.target.dataset.id);
            expenses = expenses.filter(expense => expense.id !== id);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            renderAll();
        }
    });

    // --- EXPORT ---
    exportCsvButton.addEventListener('click', () => {
        const headers = ['Amount', 'Category', 'Date', 'Note'];
        const expensesToExport = applyFilters(); // Export only filtered expenses
        const csvContent = [
            headers.join(','),
            ...expensesToExport.map(e => [e.amount, e.category, e.date, e.note].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'expenses.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- PWA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered.')).catch(err => console.log('SW registration failed:', err));
        });
    }

    // --- INITIAL RENDER ---
    renderAll();
});
