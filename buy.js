require('dotenv').config();
const SimpleSwapBot = require('./src/SimpleSwapBot');

async function quickBuy() {
    const bot = new SimpleSwapBot({ headless: false });

    try {
        console.log('🛒 Quick Buy Mode');
        
        await bot.init();
        await bot.navigateToToken(process.env.TOKEN_ADDRESS);
        await bot.connectWallet();

        const tokenSymbol = process.env.TOKEN_SYMBOL || 'RCADE';
        const ethAmount = parseFloat(process.env.ETH_AMOUNT) || 0.01;
        const slippage = parseFloat(process.env.SLIPPAGE) || 1;

        const result = await bot.buyToken(tokenSymbol, ethAmount, slippage);
        
        if (result.success) {
            console.log(`🎉 Successfully bought ${tokenSymbol}!`);
        } else {
            console.log(`😞 Buy failed: ${result.error}`);
        }

    } catch (error) {
        console.error('Buy error:', error);
    } finally {
        await bot.close();
    }
}

quickBuy().catch(console.error);
