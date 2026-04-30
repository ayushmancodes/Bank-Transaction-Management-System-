const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const accountModel = require('../models/account.model');
const mongoose = require('mongoose')
const { json } = require('express');
const userModel = require('../models/user.model');

/**
 * * - Create a new Transaction
 * The 9 step transaction : 
 *  1. Validate request
 *  2. Validate idempotency key
 *  3. Check account status
 *  4. Derive sender balance from ledger
 *  5. Create transaction (Pending)
 *  6. DEBIT ledger
 *  7. CREDIT ledger
 *  8. Mark transaction completed
 *  9. Commint mogoDB session
 */

const createTransaction = async (req, res) => {

    // 1. Validate request
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message : "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromAccountUser = await accountModel.findOne({
        _id : fromAccount
    })

    const toAccountUser = await accountModel.findOne({
        _id : toAccount
    })

    if(!fromAccountUser || !toAccountUser){
        return res.status(400).json({
            message : "Invalid fromAccount or toAccount"
        })
    }

    // 2. Validate idempotency key

    const doesTransactionExists = await transactionModel.findOne({
        idempotencyKey : idempotencyKey
    })

    if(doesTransactionExists){
        if(doesTransactionExists.status == 'COMPLETED'){
            return res.status(200).json({
                message : "Transaction completed"
            })
        }
        if(doesTransactionExists.status == 'PENDING'){
            return res.status(200).json({
                message : "Transaction is still processing"
            })
        }
        if(doesTransactionExists.status == 'FAILED'){
            return res.status(500).json({
                message : 'Transaction failed'
            })
        }
        if(doesTransactionExists.status == 'REVERSED'){
            return res.status(500).json({
                message : "Transaction was reversed"
            })
        }
    }

    // 3. Check account status
    if(fromAccountUser.status !== 'ACTIVE' || toAccountUser.status !== 'ACTIVE'){
        return res.status(400).json({
            message : "Both from account and to account must be ACTIVE to process transaction"
        })
    }

    // 4. Derive sender balance from ledger
    const balance = await fromAccountUser.getBalance();
    
    if(balance < amount){
        return res.status(400).json({
            message : `Insufficient balance, current balance : ${balance}, requested amount : ${amount}`
        })
    }

    // 5. Create Transaction : "Pending"

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
    
        const [transaction] = await transactionModel.create([{
            fromAccount, 
            toAccount, 
            amount, 
            idempotencyKey,
            status : "PENDING"
        }], {session})
    
        await ledgerModel.create([{
            account : fromAccount, 
            amount,
            type : "DEBIT",
            transaction : transaction._id
        }], {session})
    
        await ledgerModel.create([{
            account : toAccount, 
            amount,
            type : "CREDIT",
            transaction : transaction._id
        }], {session})
    
        await transactionModel.findOneAndUpdate(
            {_id : transaction._id},
            {status : "COMPLETED"},
            {session}
        )

        await transaction.save({session})
    
        await session.commitTransaction()
    
        return res.status(200).json({
            message : "Transaction Completed"
        })
        
    } catch (error) {
        await session.abortTransaction();
        console.log("Transaction error", error);
        return res.status(500).json({
            message : "Transaction failed and was rolled back"
        })
    } finally {
        session.endSession();
    }
}

const createInitialFundsTransaction = async (req, res) => {
    const {toAccount, amount, idempotencyKey} = req.body;

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message : "toAccount, amount and idempotency key are required"
        })
    }

    const doesTransactionExists = await transactionModel.findOne({ idempotencyKey });
    if(doesTransactionExists){
        return res.status(200).json({ 
            message: `Transaction already processed. Status: ${doesTransactionExists.status}` 
        });
    }

    const toAccountUser = await accountModel.findOne({
        _id : toAccount
    })

    if(!toAccountUser){
        return res.status(400).json({
            message : "Invalid account"
        })
    }

    const fromAccountUser = await accountModel.findOne({
        user : req.user._id
    })

    if(!fromAccountUser) {
        return res.status(400).json({
            message : "System user account not found "
        })
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const [transaction] = await transactionModel.create([{
            fromAccount : fromAccountUser._id, 
            toAccount, 
            amount, 
            idempotencyKey,
            status : "PENDING"
        }], {session})
    
        await ledgerModel.create([{
            account : fromAccountUser._id, 
            amount,
            type : "DEBIT",
            transaction : transaction._id
        }], {session})
    
        await ledgerModel.create([{
            account : toAccount, 
            amount,
            type : "CREDIT",
            transaction : transaction._id
        }], {session})
    
        await transactionModel.findOneAndUpdate(
            {_id : transaction._id},
            {status : "COMPLETED"},
            {session}
        )
        
        await transaction.save({session})
    
        await session.commitTransaction()
    
        return res.status(200).json({
            message : "Initial funds Transaction Completed"
        })        
    } catch (error) {
        await session.abortTransaction();
        console.log("Initial funds Transaction error", error);
        return res.status(500).json({
            message : "Initial funds Transaction failed and was rolled back"
        })   
    } finally {
        session.endSession()
    }
}

module.exports = {createTransaction, createInitialFundsTransaction}
