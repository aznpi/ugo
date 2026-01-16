const formatCurrencyAmount = function(amount,currency){
    let formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0, // Enforce no decimal places
        maximumFractionDigits: 0
    }).format(amount);
    return  formattedAmount;
};

