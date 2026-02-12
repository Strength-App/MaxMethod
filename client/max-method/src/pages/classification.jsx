function Classification() {
  return (
    <div className="classification-page">

    {/* Classification Page Header */}
    <header>
      <h1>Classification</h1>
    </header>

    {/* Gender Selection and Data Input */}
    <main>
      <p className="subheading">Gender</p>

      <div className="classification-gender-options">
      <label>
        <input type="radio" name="gender" /> Male
      </label>

      <label>
        <input type="radio" name="gender" /> Female
      </label>

      <label>
        <input type="radio" name="gender" /> Other
      </label>
      </div>


      <div className="classification-data-grid">
        <div className="classification-data">
          <p>Bench Press</p>
          <div className="input-unit">
          <input type="number" placeholder="Enter weight" />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Deadlift</p>
          <div className="input-unit">
          <input type="number" placeholder="Enter weight" />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Squat</p>
          <div className="input-unit">
          <input type="number" placeholder="Enter weight" />
          <span>lbs</span>
          </div>
        </div>

        <div className="classification-data">
          <p>Body Weight</p>
          <div className="input-unit">
          <input type="number" placeholder="Enter weight" />
          <span>lbs</span>
          </div>
        </div>
      </div>

      <div className="classification-submit">
        <button type="submit">Submit</button>
      </div>

    </main>
    </div>
  )
function Classification () {
    return (
        <div className="classification-page">

            {/* Classification Page Header */}
            <header>
                <h1>Classification</h1>
            </header>

            {/* Gender Selection and Data Input */}
            <main>
                <p className="subheading">Gender</p>

                <div className="classification-gender-options">
                    <label>
                        <input type="radio" name="gender" /> Male
                    </label>

                    <label>
                        <input type="radio" name="gender" /> Female
                    </label>

                    <label>
                        <input type="radio" name="gender" /> Other
                    </label>
                </div>


                <div className="classification-data-grid">
                    <div className="classification-data">
                        <p>Bench Press</p>
                        <div className="input-unit">
                            <input type="number" placeholder="Enter weight" />
                            <span>lbs</span>
                        </div>
                    </div>

                    <div className="classification-data">
                        <p>Deadlift</p>
                        <div className="input-unit">
                            <input type="number" placeholder="Enter weight" />
                            <span>lbs</span>
                        </div>
                    </div>

                    <div className="classification-data">
                        <p>Squat</p>
                        <div className="input-unit">
                            <input type="number" placeholder="Enter weight" />
                            <span>lbs</span>
                        </div>
                    </div>

                    <div className="classification-data">
                        <p>Body Weight</p>
                        <div className="input-unit">
                            <input type="number" placeholder="Enter weight" />
                            <span>lbs</span>
                        </div>
                    </div>
                </div>

                <div className="classification-submit">
                    <button type="submit">Submit</button>
                </div>

            </main>
        </div>
    )
}

export default Classification;