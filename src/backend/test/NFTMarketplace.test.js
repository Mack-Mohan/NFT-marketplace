const {expect} = require("chai");

const toWei= (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("NFTMarketplace", function(){
    let deployer, add1, add2, nft, marketplace, feePercent=1, URI="Sample URI";

    beforeEach(async function(){

        const NFT = await ethers.getContractFactory("NFT");
        const Marketplace = await ethers.getContractFactory("Marketplace");

        [deployer, add1,add2] = await ethers.getSigners();

        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);

    });

    describe("Deployment", function(){
        it("should track name and symbol", async function(){
            expect(await nft.name()).to.equal("DApp NFT")
            expect(await nft.symbol()).to.equal("DAPP")
        })
    })

    describe("Minting NFTs", function(){
        it("should tract each NFT", async function(){
            await nft.connect(add1).mint(URI);
            expect(await nft.tokenCount()).to.equal(1);
            expect(await nft.balanceOf(add1.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);


            await nft.connect(add2).mint(URI);
            expect(await nft.tokenCount()).to.equal(2);
            expect(await nft.balanceOf(add2.address)).to.equal(1);
            expect(await nft.tokenURI(2)).to.equal(URI);
        })
    })

    describe("Making marketplace items", function(){

        beforeEach(async function(){

            await nft.connect(add1).mint(URI);
            await nft.connect(add1).setApprovalForAll(marketplace.address, true)
        })
        
        it("Should track newly created item, tranfer NFT from seller to marketplace and emit offerd event", async function(){
            await  expect(marketplace.connect(add1).makeItem(nft.address, 1, toWei(1)))
            .to.emit(marketplace, "Offered")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(1),
                add1.address
            )

            expect(await nft.ownerOf(1)).to.equal(marketplace.address);
            expect(await marketplace.itemCount()).to.equal(1)

            const item = await marketplace.items(1)
            expect(item.itemId).to.equal(1)
            expect(item.nft).to.equal(nft.address)
            expect(item.tokenId).to.equal(1)
            expect(item.price).to.equal(toWei(1))
            expect(item.sold).to.equal(false)

        });

        it("Should fail if the price is less than zero", async function(){
            await expect(
                marketplace.connect(add1).makeItem(nft.address,1,0)
            ).to.be.revertedWith("Price must be greater than 0");
        })
    })

    describe("Purchasing marketplace items", function(){

        let price = 2;
        let totalPriceInWei;

        beforeEach(async function(){

            await nft.connect(add1).mint(URI);
            await nft.connect(add1).setApprovalForAll(marketplace.address, true)
            await marketplace.connect(add1).makeItem(nft.address, 1, toWei(price))
        })

        it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit bought event", async function(){
            const sellerInitialEthBal = await add1.getBalance()
            const feeAccountInitialEthBal = await deployer.getBalance()

            totalPriceInWei = await marketplace.getTotalPrice(1);

            await expect(marketplace.connect(add2).purchaseItem(1, {value: totalPriceInWei}))
            .to.emit(marketplace, "Bought")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(price),
                add1.address,
                add2.address
            )

            const sellerFinalEthBal = await add1.getBalance()
            const feeAccountFinalEthBal = await deployer.getBalance()

            console.log(feeAccountFinalEthBal)
            console.log(feeAccountInitialEthBal)

            expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal))

            const fee = (feePercent/100) * price


            expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialEthBal))

            expect(await nft.ownerOf(1)).to.equal(add2.address)

            expect((await marketplace.items(1)).sold).to.equal(true)

        })

        it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function(){
            await expect(
                marketplace.connect(add2).purchaseItem(2, {value: totalPriceInWei})
            ).to.be.revertedWith("Item does not exist")
            await expect(
                marketplace.connect(add2).purchaseItem(0, {value: totalPriceInWei})
            ).to.be.revertedWith("Item does not exist")
            await expect(
                marketplace.connect(add2).purchaseItem(1, {value: toWei(price)})
            ).to.be.revertedWith("not enough ether to cover item price and market fee")

            await marketplace.connect(add2).purchaseItem(1, {value: totalPriceInWei})
            await expect(
                marketplace.connect(deployer).purchaseItem(1, {value: totalPriceInWei})
            ).to.be.revertedWith("Sold")   
        })

    })

})   