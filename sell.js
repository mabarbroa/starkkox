require('dotenv').config();
const SimpleSwapBot = require('./src/SimpleSwapBot');

async function quickSell() {
    const bot = new SimpleSwapBot({ headless: false });

    try {
        console.log('💰 Quick Sell Mode');
        
        await bot.init();
        await bot.navigateToToken(process.env.TOKEN_ADDRESS);
        await bot.connectWallet();

        const tokenSymbol = process.env.TOKEN_SYMBOL || 'RCADE';
        const tokenAmount = parseFloat(process.env.TOKEN_AMOUNT) || 1000;
        const slippage = parseFloat(process.env.SLIPPAGE) || 1;

        const result = await bot.sellToken(tokenSymbol, tokenAmount, slippage);
        
        if (result.success) {
            console.log(`🎉 Successfully sold ${tokenSymbol}!`);
        } else {
            console.log(`😞 Sell failed: ${result.error}`);
        }

    } catch (error) {
        console.error('Sell error:', error);
    } finally {
        await bot.close();
    }
}

quickSell().catch(console.error);
