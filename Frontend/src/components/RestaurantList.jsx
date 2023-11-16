import React, { useState, useEffect } from "react";
import "./RestaurantList.css";
import axios from "axios";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import customAxios from "../services/axiosInterceptor";

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [modal, setModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);



  const getRestaurants = async () => {
    try {
      const { data } = await axios.get("http://localhost:3000/api/restaurants");
      setRestaurants(data);
  
      

      const restaurantsWithOwners = await Promise.all(
        Array.isArray(data)
          ? data.map(async (restaurant) => {
              const ownerResponse = await axios.get(`http://localhost:3000/api/owners/${restaurant.ownerId}`);
              const owner = ownerResponse.data;
              return { ...restaurant, owner };
            })
          : []
      );

      setRestaurants(restaurantsWithOwners);
    } catch (error) {
      console.log(error);

      if (error.response.status === 403 || error.response.status === 401) {
        localStorage.clear();
      }
    }
  };

  const handleBanRestaurant = async (id) => {
    try {
      const response = await customAxios.post(`http://localhost:3000/api/restaurants/ban/${id}`);
      console.log(response.data);
      if (response.status === 200) {
        getRestaurants();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSeeReviews = async (id) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/restaurants/reviews/${id}`);

      if (response.status === 200) {
        const fetchedReviews = response.data.reviews;
        setReviews(fetchedReviews);
        setSelectedRestaurant(id); 
        toggleModal();
      } else {
        console.error(`HTTP error! Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const toggleModal = () => {
    setModal(!modal);
  };

  if (modal) {
    document.body.classList.add('active-modal');
  } else {
    document.body.classList.remove('active-modal');
  }

  useEffect(() => {
    getRestaurants();
  }, []);


 
  return (
    <>
      <Navbar />
      <div>
      <label>Filter by Rating:</label>
      <select onChange={(e) => filterRestaurantsByRating(e.target.value)}>
        <option value="">All Ratings</option>
        <option value="1">1 star</option>
        <option value="2">2 stars</option>
        <option value="3">3 stars</option>
        <option value="4">4 stars</option>
        <option value="5">5 stars</option>
      </select>
      <div className="filter-container">
        <label>Filter by Date of Creation:</label>
        <select>
          <option value="">All Dates</option>
          <option value="oldest">Oldest</option>
          <option value="latest">Latest</option>
        </select>
      </div>

      
    </div>
   
      <table>
        <thead>
          <tr>
            <th>Restaurant Name</th>
            <th>Owner Name</th>
            <th>Owner Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((restaurant) => (
            <tr key={restaurant.id}>
              <td className="restaurant-cell">
                <span className="restaurant-name">{restaurant.name}</span>
                <Link className="custom-link" onClick={() => handleSeeReviews(restaurant.id)}>
                  See Reviews
                </Link>
              </td>
              <td>{restaurant.owner ? restaurant.owner.fullname : "N/A"}</td>
              <td>{restaurant.owner ? restaurant.owner.email : "N/A"}</td>
              <td className="text-center">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-full border-none cursor-pointer"
                  onClick={() => handleBanRestaurant(restaurant.id)}
                >
                  Ban
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && selectedRestaurant && (
  <div className="modal-custom">
    <div onClick={toggleModal} className="overlay"></div>
    <div className="modal-content-custom">
      {(reviews ?? []).length > 0 ? (
        reviews.map((review) => (
          <div key={review.id}>
          
            <h3>
              <strong style={{ fontSize: '1.5em' }}>{review.review_title}</strong>
            </h3>
            <p>{review.review_body}</p>
            <p>
              Rating: {review.rating} <span style={{ color: 'gold' }}>★</span>
            </p>
          </div>
        ))
      ) : (
        <p>No reviews available.</p>
      )}
      <button
        className="close-modal-custom btn btn-lg btn-primary px-3 d-none d-lg-block"
        onClick={toggleModal}
      >
        CLOSE
      </button>
    </div>
  </div>
)}

    </>
  );
};

export default RestaurantList;
