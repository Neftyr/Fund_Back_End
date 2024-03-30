const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    let fundWithStorage
    log(`Our Deployer Account Is: ${deployer}`)
    log("----------------------------------------------------")
    log("Deploying FunWithStorage and waiting for confirmations...")
    const funWithStorage = await deploy("FunWithStorage", {
        from: deployer,
        args: [],
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`What is that: ${funWithStorage} if it has not contract functions`)

    fundWithStorage = await ethers.getContract("FunWithStorage", deployer)
    log(`What is diff: ${fundWithStorage}`)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(funWithStorage.address, [])
    }

    log("Logging storage...")
    for (let i = 0; i < 10; i++) {
        //log("Doing Stuff...")
        //const processTrans = await fundWithStorage.doStuff()
        //await processTrans.wait(1)

        // const x =  await fundWithStorage.getArray()
        // const y = await fundWithStorage.getMap(0)
        // log(`Log taki ze chuj: ${x} and ${y}`)

        // Getting Both Returns From Solidity Function
        const result = await fundWithStorage.getBoth(0)
        // Making Dictionary To Read Both Returns
        const { 0: our_array, 1: our_bool } = result
        log(`Our Solidity Multiple Returns: ${our_array} and ${our_bool}`)

        log(`Location ${i}: ${await ethers.provider.getStorageAt(fundWithStorage.address, i)}`)
    }

    // You can use this to trace!
    log("----------------------------------------------------")
    log("Logging Array And Mapping...")
    const trace = await network.provider.send("debug_traceTransaction", [funWithStorage.transactionHash])
    for (structLog in trace.structLogs) {
        if (trace.structLogs[structLog].op == "SSTORE") {
            log(trace.structLogs[structLog])
        }
    }
    const firstelementLocation = ethers.utils.keccak256("0x0000000000000000000000000000000000000000000000000000000000000002")
    const arrayElement = await ethers.provider.getStorageAt(funWithStorage.address, firstelementLocation)
    log(`Location ${firstelementLocation}: ${arrayElement}`)

    // Converting Hex To Int
    const ourHexConverted = parseInt(arrayElement, 16)
    log(`Our Decoded Hex: ${ourHexConverted}`)

    // Solution For Mapping
    const firstelementLocationMap = ethers.utils.keccak256(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000003"
    )
    const mapElement = await ethers.provider.getStorageAt(funWithStorage.address, firstelementLocationMap)
    log(`Location ${firstelementLocationMap}: ${mapElement}`)

    // Converting Hex To Int
    const ourHexConvertedMap = parseInt(mapElement, 16)
    log(`Our Decoded Hex: ${ourHexConvertedMap}`)

    // Can you write a function that finds the storage slot of the arrays and mappings?
    // And then find the data in those slots?
}

module.exports.tags = ["storage"]
