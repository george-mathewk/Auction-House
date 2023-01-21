const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiledFactory = require('../build/AuctionFactory.json');
const compiledAuction = require('../build/Auction.json');
const { isAsyncFunction } = require('util/types');

let accounts;
let factory;
let auction;
let auctionAddress;

beforeEach( async () =>{
    accounts = await web3.eth.getAccounts();

    factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({data: compiledFactory.bytecode})
    .send({from: accounts[0], gas:'1000000'});

    await factory.methods.createAuctions('100').send({from: accounts[0], gas:'1000000'});

    const address = await factory.methods.getAuctions().call();
    auctionAddress = address[0];

    auction =  await new web3.eth.Contract(JSON.parse(compiledAuction.interface), auctionAddress);
});

describe("Auction House", () =>{
    it('to check if factory and auction is deployed', ()=>{
        assert.ok(factory.options.address);
        assert.ok(auction.options.address);
    });

    it("check if manager create contract", async ()=>{
        const manager = await auction.methods.manager().call();
        assert.equal(manager, accounts[0]);
    });

    it("entering into the listing", async () =>{
        await auction.methods.listingEntry().send({from: accounts[1], value:'100'});

        const isBidder = await auction.methods.bidder(accounts[1]).call();
        assert(isBidder);
    });

    it("check for minimum entry", async ()=>{
        try{
            await auction.methods.listingEntry().send({from: accounts[1], value:'50'});
            assert(false);
        }catch(err){
            assert.ok(err);
        }
    });

    it("create a listing, and auction is closed", async() =>{
        await auction.methods.createListing("NFT", "10000", "50", accounts[1]).send({from: accounts[0], gas:'1000000'});

        const listing = await auction.methods.listings(0).call();

        assert.equal(listing.description, "NFT");
        assert(!listing.open);
    });

    it("bidding system check", async ()=>{
        await auction.methods.createListing("NFT", "10000", "50", accounts[1]).send({from: accounts[0], gas:'1000000'});
        await auction.methods.listingEntry().send({from: accounts[1], value:'100'});
        await auction.methods.startAuction(0).send({from: accounts[0], gas:'1000000'});
        await auction.methods.increamentalBid(0).send({from:accounts[1], gas:'1000000'});
        await auction.methods.bid(13000,0).send({from: accounts[1], gas:'1000000'});

        const listing = await auction.methods.listings(0).call();
        assert.equal(listing.totalAuction, 13000);
    });

    it("to check if modifier works", async ()=>{
        try{
            await auction.methods.createListing("NFT", "10000", "50", accounts[2]).send({from: accounts[0], gas:'1000000'});
            await auction.methods.listingEntry().send({from: accounts[1], value:'100'});
            await auction.methods.startAuction(0).send({from: accounts[1], gas:'1000000'});
            assert(false);
        }catch(err){
            assert.ok(err);
        }
    });

    it("to check if the whole system works", async ()=>{
        await auction.methods.createListing("NFT", "10000", "50", accounts[2]).send({from: accounts[0], gas:'1000000'});
        await auction.methods.listingEntry().send({from: accounts[1], value:'100'});
        await auction.methods.startAuction(0).send({from: accounts[0], gas:'1000000'});
        await auction.methods.increamentalBid(0).send({from:accounts[1], gas:'1000000'});
        await auction.methods.bid(13000,0).send({from: accounts[1], gas:'1000000'});  
        await auction.methods.closeAuction(0).send({from:accounts[0], gas:'1000000'});
        const initialBalance = await web3.eth.getBalance(accounts[2]);
        await auction.methods.transferFunds(0).send({from:accounts[1], value:'13000'});
        const finalBalance = await web3.eth.getBalance(accounts[2]);

        const listing = await auction.methods.listings(0).call();

        assert((finalBalance-initialBalance) > 12500);
        assert(!listing.open);

    });
    
});