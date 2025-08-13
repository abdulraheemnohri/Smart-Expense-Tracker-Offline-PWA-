document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const themeToggle = document.getElementById('theme-toggle');
    const expenseForm = document.getElementById('expense-form');
    const expensesList = document.getElementById('expenses-list');
    const categoryChartCanvas = document.getElementById('category-chart').getContext('2d');
    const monthlyChartCanvas = document.getElementById('monthly-chart').getContext('2d');
    const exportCsvButton = document.getElementById('export-csv');
    // Filters
    const filterCategory = document.getElementById('filter-category');
    const filterMonth = document.getElementById('filter-month');
    const filterPaymentMethod = document.getElementById('filter-payment-method');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterMinAmount = document.getElementById('filter-min-amount');
    const filterMaxAmount = document.getElementById('filter-max-amount');
    const clearFiltersButton = document.getElementById('clear-filters');
    // Modal
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeModalBtn = document.querySelector('.close-btn');
    const cancelModalBtn = document.querySelector('.cancel-btn');

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
            expensesList.innerHTML = '<tr><td colspan="6">No matching expenses.</td></tr>';
            return;
        }
        expensesToRender.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>$${expense.amount.toFixed(2)}</td>
                <td>${expense.category}</td>
                <td>${expense.date}</td>
                <td>${expense.note}</td>
                <td>${expense.paymentMethod}</td>
                <td>
                    <button class="edit-btn" data-id="${expense.id}">Edit</button>
                    <button class="delete-btn" data-id="${expense.id}">Delete</button>
                </td>
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
        const monthValue = filterMonth.value;
        const paymentMethodValue = filterPaymentMethod.value;
        const startDateValue = filterStartDate.value;
        const endDateValue = filterEndDate.value;
        const minAmountValue = parseFloat(filterMinAmount.value);
        const maxAmountValue = parseFloat(filterMaxAmount.value);

        let filteredExpenses = expenses;

        if (categoryValue) {
            filteredExpenses = filteredExpenses.filter(e => e.category.toLowerCase().includes(categoryValue));
        }
        if (monthValue) {
            filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(monthValue));
        }
        if (paymentMethodValue) {
            filteredExpenses = filteredExpenses.filter(e => e.paymentMethod === paymentMethodValue);
        }
        if (startDateValue) {
            filteredExpenses = filteredExpenses.filter(e => e.date >= startDateValue);
        }
        if (endDateValue) {
            filteredExpenses = filteredExpenses.filter(e => e.date <= endDateValue);
        }
        if (!isNaN(minAmountValue)) {
            filteredExpenses = filteredExpenses.filter(e => e.amount >= minAmountValue);
        }
        if (!isNaN(maxAmountValue)) {
            filteredExpenses = filteredExpenses.filter(e => e.amount <= maxAmountValue);
        }

        return filteredExpenses;
    };

    const renderAll = () => {
        const filteredExpenses = applyFilters();
        renderExpenses(filteredExpenses);
        updatePieChart(filteredExpenses);
        updateMonthlyChart(filteredExpenses);
    };

    [filterCategory, filterMonth, filterPaymentMethod, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount].forEach(el => {
        el.addEventListener('input', renderAll);
    });

    clearFiltersButton.addEventListener('click', () => {
        filterCategory.value = '';
        filterMonth.value = '';
        filterPaymentMethod.value = '';
        filterStartDate.value = '';
        filterEndDate.value = '';
        filterMinAmount.value = '';
        filterMaxAmount.value = '';
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
            note: document.getElementById('note').value,
            paymentMethod: document.getElementById('payment-method').value
        };
        if (!newExpense.amount || !newExpense.category || !newExpense.date || !newExpense.paymentMethod) {
            alert('Please fill in all required fields.');
            return;
        }
        expenses.push(newExpense);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        renderAll();
        expenseForm.reset();
    });

    expensesList.addEventListener('click', e => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.classList.contains('delete-btn')) {
            expenses = expenses.filter(expense => expense.id !== id);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            renderAll();
        }
        if (e.target.classList.contains('edit-btn')) {
            openEditModal(id);
        }
    });

    // --- MODAL LOGIC ---
    const openEditModal = (id) => {
        const expense = expenses.find(e => e.id === id);
        if (expense) {
            document.getElementById('edit-id').value = expense.id;
            document.getElementById('edit-amount').value = expense.amount;
            document.getElementById('edit-category').value = expense.category;
            document.getElementById('edit-date').value = expense.date;
            document.getElementById('edit-note').value = expense.note;
            document.getElementById('edit-payment-method').value = expense.paymentMethod;
            editModal.style.display = 'block';
        }
    };

    const closeEditModal = () => {
        editModal.style.display = 'none';
    };

    editForm.addEventListener('submit', e => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-id').value);
        const expenseIndex = expenses.findIndex(e => e.id === id);
        if (expenseIndex > -1) {
            expenses[expenseIndex] = {
                id: id,
                amount: parseFloat(document.getElementById('edit-amount').value),
                category: document.getElementById('edit-category').value,
                date: document.getElementById('edit-date').value,
                note: document.getElementById('edit-note').value,
                paymentMethod: document.getElementById('edit-payment-method').value
            };
            localStorage.setItem('expenses', JSON.stringify(expenses));
            closeEditModal();
            renderAll();
        }
    });

    closeModalBtn.addEventListener('click', closeEditModal);
    cancelModalBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', e => {
        if (e.target == editModal) {
            closeEditModal();
        }
    });

    // --- EXPORT ---
    exportCsvButton.addEventListener('click', () => {
        const headers = ['Amount', 'Category', 'Date', 'Note', 'Payment Method'];
        const expensesToExport = applyFilters();
        const csvContent = [
            headers.join(','),
            ...expensesToExport.map(e => [e.amount, e.category, e.date, e.note, e.paymentMethod].join(','))
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
