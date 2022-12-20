const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
//require("@nomicfoundation/hardhat-chai-matchers")

// condition ? val1 : val2 -> If condition is true, the operator has the value of val1. Otherwise it has the value of val2.
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let mockV3Aggregator
          let deployer
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async () => {
              // const accounts = await ethers.getSigners()
              // deployer = accounts[0]
              // Below is equal to: const { deployer } = await getNamedAccounts()
              deployer = (await getNamedAccounts()).deployer
              // Below will just run thru all scripts in deploy folder with given tag "all", so everything will be deployed to testing
              await deployments.fixture(["all"])
              // Below will just grab [-1], so last deployed contract
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
          })

          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
              // could also do assert.fail
              it("Fails if you don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith("You need to spend more ETH!")
              })
              // we could be even more precise here by making sure exactly $50 works
              // but this is good enough for now
              it("Updates the amount funded data structure", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(deployer)
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funder to array of funders", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getFunder(0)
                  assert.equal(response, deployer)
              })
          })
          describe("withdraw", function () {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })
              it("Withdraws ETH from a single funder", async () => {
                  // Arrange
                  const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()

                  // Our deployer paid some gas to withdraw money from fundMe, we calculate that cost below.
                  // We are pulling out those 2 variables from withdraw transaction (we are pulling objects from another objects by using { })
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  // EffectiveGasPrice * GasUsed = GasCost -> those are BigNumbers that's why we do not use * but ".mul" to multiply
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  console.log(`Withdraw GasCost: ${gasCost}`)
                  console.log(`Withdraw GasUsed: ${gasUsed}`)
                  console.log(`Withdraw GasPrice: ${effectiveGasPrice}`)

                  const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Assert
                  // Maybe clean up to understand the testing
                  assert.equal(endingFundMeBalance, 0)
                  // Add below works as "+" and we are working with BigNumber's type that's why we use .add instead of "+"
                  assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString())
              })
              it("cheaperWithdraws ETH from a single funder", async () => {
                  // Arrange
                  const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait()

                  // Our deployer paid some gas to withdraw money from fundMe, we calculate that cost below.
                  // We are pulling out those 2 variables from withdraw transaction (we are pulling objects from another objects by using { })
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  // EffectiveGasPrice * GasUsed = GasCost -> those are BigNumbers that's why we do not use * but ".mul" to multiply
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  console.log(`cheaperWithdraw GasCost: ${gasCost}`)
                  console.log(`cheaperWithdraw GasUsed: ${gasUsed}`)
                  console.log(`cheaperWithdraw GasPrice: ${effectiveGasPrice}`)

                  const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Assert
                  // Maybe clean up to understand the testing
                  assert.equal(endingFundMeBalance, 0)
                  // Add below works as "+" and we are working with BigNumber's type that's why we use .add instead of "+"
                  assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString())
              })
              // this test is overloaded. Ideally we'd split it into multiple tests
              // but for simplicity we left it as one
              it("is allows us to withdraw with multiple funders", async () => {
                  // Arrange
                  // Looping thru for first 6 accounts and funding for all 6 accounts
                  const accounts = await ethers.getSigners()
                  for (i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(accounts[i])
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`Withdraw Multi Funders GasCost: ${withdrawGasCost}`)
                  console.log(`Withdraw Multi Funders GasUsed: ${gasUsed}`)
                  console.log(`Withdraw Multi Funders GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(withdrawGasCost).toString())

                  // Make sure that funders are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  // Checking if all accounts (funders), which was funding contract have now balance 0
                  for (i = 1; i < 6; i++) {
                      assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0)
                  }
              })
              it("is allows us to cheaperWithdraw with multiple funders", async () => {
                  // Arrange
                  // Looping thru for first 6 accounts and funding for all 6 accounts
                  const accounts = await ethers.getSigners()
                  for (i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(accounts[i])
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`cheaperWithdraw Multi Funders GasCost: ${withdrawGasCost}`)
                  console.log(`cheaperWithdraw Multi Funders GasUsed: ${gasUsed}`)
                  console.log(`cheaperWithdraw Multi Funders GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                  const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(withdrawGasCost).toString())

                  // Make sure that funders are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  // Checking if all accounts (funders), which was funding contract have now balance 0
                  for (i = 1; i < 6; i++) {
                      assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0)
                  }
              })
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerFundMeConnectedContract = await fundMe.connect(attacker)
                  await expect(attackerFundMeConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner")
                  // Custom Error Note(not based on solidity contract code):
                  //await expect(attackerFundMeConnectedContract.withdraw()).to.be.revertedWithCustomError(fundMe, "Our_Custom_Error God Outplay!")
              })
          })
      })
