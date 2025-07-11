require('dotenv').config();
const SimpleSwapBot = require('./src/SimpleSwapBot');

async function main() {
    const bot = new SimpleSwapBot({
        headless: process.env.HEADLESS === 'true'
    });

    try {
        // Initialize
        await bot.init();
        await bot.navigateToToken(process.env.TOKEN_ADDRESS);
        await bot.connectWallet();

        // Get parameters from environment or command line
        const action = process.argv[2] || process.env.ACTION || 'buy';
        const tokenSymbol = process.env.TOKEN_SYMBOL || 'RCADE';
        const amount = parseFloat(process.env.AMOUNT) || 0.01;
        const slippage = parseFloat(process.env.SLIPPAGE) || 1;

        let result;
        if (action === 'buy') {
            result = await bot.buyToken(tokenSymbol, amount, slippage);
        } else if (action === 'sell') {
            result = await bot.sellToken(tokenSymbol, amount, slippage);
        } else {
            console.error('Invalid action. Use: buy or sell');
            return;
        }

        console.log('Final result:', result);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await bot.close();
    }
}

main().catch(console.error);
