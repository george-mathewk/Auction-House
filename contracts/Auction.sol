// SPDX-License-Identifier: GPL-3.0
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.4.17;

contract AuctionFactory {
    address[] public deployedAuctions;

    function createAuctions(uint256 fee) public {
        address newAuction = new Auction(fee, msg.sender);
        deployedAuctions.push(newAuction);
    }

    function getAuctions() public view returns (address[]) {
        return deployedAuctions;
    }
}

contract Auction {
    struct Listing {
        string description;
        uint256 startingValue;
        uint256 increaseAmt;
        address itemID;
        bool open;
        uint256 totalAuction;
        address highestBidder;
    }

    Listing[] public listings;
    address public manager;
    uint256 public entryFee;
    mapping(address => bool) public bidder;

    modifier restricted() {
        require(msg.sender == manager);
        _;
    }

    function Auction(uint256 entry, address creator) public {
        manager = creator;
        entryFee = entry;
    }

    function listingEntry() public payable {
        require(msg.value >= entryFee);
        bidder[msg.sender] = true;
    }

    function createListing(
        string description,
        uint256 startingValue,
        uint256 increaseAmt,
        address itemID
    ) public restricted {
        Listing memory newListing = Listing({
            description: description,
            startingValue: startingValue,
            increaseAmt: increaseAmt,
            itemID: itemID,
            open: false,
            totalAuction: 0,
            highestBidder: manager
        });

        listings.push(newListing);
    }

    function startAuction(uint256 index) public restricted {
        Listing storage listing = listings[index];
        listing.open = true;
        listing.totalAuction = listing.startingValue;
    }

    function bid(uint256 amount, uint256 index) public {
        Listing storage listing = listings[index];
        require(listing.open);
        require(bidder[msg.sender]);
        require(amount > listing.totalAuction);
        listing.totalAuction = amount;
        listing.highestBidder = msg.sender;
    }

    function increamentalBid(uint256 index) public {
        Listing storage listing = listings[index];
        require(listing.open);
        require(bidder[msg.sender]);
        listing.totalAuction = listing.totalAuction + listing.increaseAmt;
        listing.highestBidder = msg.sender;
    }

    function auctionWinner(uint256 index)
        public
        view
        returns (uint256 totalAuction, address highestBidder)
    {
        Listing storage listing = listings[index];
        return (listing.totalAuction, listing.highestBidder);
    }

    function closeAuction(uint256 index) public restricted {
        Listing storage listing = listings[index];
        listing.open = false;
    }

    function transferFunds(uint256 index) public payable {
        Listing storage listing = listings[index];
        require(msg.sender == listing.highestBidder);
        require(msg.value == listing.totalAuction);
        listing.itemID.transfer(listing.totalAuction);
    }
}
