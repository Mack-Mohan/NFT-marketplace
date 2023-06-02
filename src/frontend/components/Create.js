import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button } from 'react-bootstrap'
import axios from 'axios'
import FormData from 'form-data'


const pinataBaseUrl = 'https://api.pinata.cloud'
const Create = ({ marketplace, nft }) => {
  const [image, setImage] = useState('')
  const [price, setPrice] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')




  const uploadToIPFS = async (event) => {
    event.preventDefault()
    const file = event.target.files[0]
    const formData = new FormData

    formData.append('file', file, file.name)
  
    try {
      const { data: responseData } = await axios.post(`${pinataBaseUrl}/pinning/pinFileToIPFS`, formData, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: "3c47b95b69dbfbcf25bc",
          pinata_secret_api_key: "53f37e65b093045f3bcc111fc7de0ac7eb297ede72ece92cc0b4a62810d97f90"
        }
      })
      const url = `https://ipfs.io/ipfs/${responseData.IpfsHash}?filename=${file.name}`
      setImage(url)
    } catch (error) {
      console.log(error)
    }
  }


const createNFT = async () => {
    // if (!image || !price || !name || !description) returns
    let meta = {image, price, name, description}
    try {
      const { data: responseData } = await axios.post(`${pinataBaseUrl}/pinning/pinJSONToIPFS`, meta, {
        headers: {
          pinata_api_key: "3c47b95b69dbfbcf25bc",
          pinata_secret_api_key: "53f37e65b093045f3bcc111fc7de0ac7eb297ede72ece92cc0b4a62810d97f90"
        }
      }) 
      const url = `https://ipfs.io/ipfs/${responseData.IpfsHash}?filename=${name}`
      mintThenList(url)
      
    }catch(error) {
      console.log("ipfs uri upload error: ", error)
    }
  }






  const mintThenList = async (result) => {
    const uri = result
    // mint nft 
    await(await nft.mint(uri)).wait()
    // get tokenId of new nft 
    const id = await nft.tokenCount()

    console.log(id)
    // approve marketplace to spend nft
    await(await nft.setApprovalForAll(marketplace.address, true)).wait()
    // add nft to marketplace
    const listingPrice = ethers.utils.parseEther(price.toString())
    await(await marketplace.makeItem(nft.address, id, listingPrice)).wait()
    
  }

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
          <div className="content mx-auto">
            <Row className="g-4">
              <Form.Control
                type="file"
                required
                name="file"
                onChange={uploadToIPFS}
              />
              <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
              <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
              <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in ETH" />
              <div className="d-grid px-0">
                <Button onClick={createNFT} variant="primary" size="lg">
                  Create & List NFT!
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Create