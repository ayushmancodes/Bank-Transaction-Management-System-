const mongoose = require('mongoose')

const ledgerSchema = new mongoose.Schema({
    account : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "account",
        required : [true, "Ledger must be associated with an account"],
        index : true, 
        immutable : true
    },
    amount : {
        type : Number, 
        required : [true, "Amount is required for creating a ledger entry"],
        immutable : true
    },
    transaction : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "transaction",
        required : [true, "Ledger must be associated with a transaction"],
        index : true, 
        immutable : true
    },
    type : {
        type : String, 
        enum : ["CREDIT", "DEBIT"],
        required : [true, "Ledger type is required"],
        immutable : true 
    }
}, {
    timestamps : true
})

const perventLedgerModification = function(){
    throw new Error("Ledger entries are immutable and can not be modified");
}

ledgerSchema.pre('findOneAndUpdate', perventLedgerModification);
ledgerSchema.pre('findOneAndDelete', perventLedgerModification);
ledgerSchema.pre('findOneAndReplace', perventLedgerModification);
ledgerSchema.pre('updateOne', perventLedgerModification);
ledgerSchema.pre('deleteOne', perventLedgerModification);
ledgerSchema.pre('deleteMany', perventLedgerModification);
ledgerSchema.pre('remove', perventLedgerModification);
ledgerSchema.pre('updateMany', perventLedgerModification);

ledgerSchema.pre('save', function(next) {
    if(!this.isNew){
        return next(new Error("Cannot modify an existing ledger entry."));
    }
    next();
})

const ledgerModel = mongoose.model("ledger", ledgerSchema);

module.exports = ledgerModel;