import test from "node:test";
import assert from "node:assert/strict";
import {
  HOTSPOT_THRESHOLD,
  HOTSPOT_MAX_RADIUS_KM,
  HOTSPOT_ROOTS,
  freshState,
  validJob,
  jobSearchCircle,
  needsGeographicSplit,
  splitHotspotJob,
  shouldSplitVenueResult,
  venueCandidate,
  mergeCandidate,
  candidatePoint,
  cityKey,
  snapshotFromState,
} from "../functions/lib/concert-hotspots.js";

test("hotspot threshold is strictly more than 10", () => {
  assert.equal(HOTSPOT_THRESHOLD, 11);
  const state=freshState(Date.UTC(2026,8,29));
  state.verified.a={city:"A",countryCode:"US",lat:1,lng:2,count:10};
  state.verified.b={city:"B",countryCode:"US",lat:1,lng:2,count:11};
  const snap=snapshotFromState(state,Date.UTC(2026,8,29));
  assert.deepEqual(snap.hotspots.map(x=>x.city),["B"]);
});

test("root jobs are valid and large regions subdivide into gap-free children", () => {
  assert.ok(HOTSPOT_ROOTS.length >= 10);
  for (const job of HOTSPOT_ROOTS) assert.equal(validJob(job),true);
  const large=HOTSPOT_ROOTS.find(needsGeographicSplit);
  assert.ok(large);
  const children=splitHotspotJob(large);
  assert.equal(children.length,4);
  for (const child of children) assert.equal(validJob(child),true);
  const area=j=>(j.maxLat-j.minLat)*(j.maxLng-j.minLng);
  const total=children.reduce((sum,j)=>sum+area(j),0);
  assert.ok(Math.abs(total-area(large))<1e-9);
});


test("problem European cities are inside the first-pass geographic coverage", () => {
  const cities=[
    ["Paris",48.8566,2.3522],
    ["Lyon",45.7640,4.8357],
    ["Madrid",40.4168,-3.7038],
    ["Barcelona",41.3874,2.1686],
    ["Berlin",52.5200,13.4050],
    ["Vienna",48.2082,16.3738],
    ["Prague",50.0755,14.4378],
    ["Warsaw",52.2297,21.0122],
  ];
  for(const [name,lat,lng] of cities){
    const covered=HOTSPOT_ROOTS.some(j=>lat>=j.minLat&&lat<=j.maxLat&&lng>=j.minLng&&lng<=j.maxLng);
    assert.equal(covered,true,name+" must be covered");
  }
});

test("venue candidates distinguish same-named cities in different states", () => {
  const a=venueCandidate({
    city:{name:"Springfield"}, state:{stateCode:"IL"}, country:{countryCode:"US"},
    location:{latitude:"39.80",longitude:"-89.64"}, upcomingEvents:{_total:5},
  });
  const b=venueCandidate({
    city:{name:"Springfield"}, state:{stateCode:"MO"}, country:{countryCode:"US"},
    location:{latitude:"37.21",longitude:"-93.29"}, upcomingEvents:{_total:5},
  });
  assert.ok(a && b);
  assert.notEqual(a.key,b.key);
  assert.notEqual(cityKey("Springfield","IL","US"),cityKey("Springfield","MO","US"));
});

test("zero-upcoming venues and invalid coordinates are rejected", () => {
  assert.equal(venueCandidate({
    city:{name:"Paris"}, country:{countryCode:"FR"},
    location:{latitude:"48.8566",longitude:"2.3522"}, upcomingEvents:{_total:0},
  }),null);
  assert.equal(venueCandidate({
    city:{name:"Nowhere"}, country:{countryCode:"XX"},
    location:{latitude:"",longitude:""},
  }),null);
});

test("candidate merge preserves all samples and produces an averaged point", () => {
  const store={};
  const one={key:"madrid||es",city:"Madrid",stateCode:"",countryCode:"ES",lat:40.4,lng:-3.7};
  const two={...one,lat:40.6,lng:-3.5};
  assert.equal(mergeCandidate(store,one),true);
  assert.equal(mergeCandidate(store,two),false);
  const p=candidatePoint(store[one.key]);
  assert.equal(p.lat,40.5);
  assert.equal(p.lng,-3.6);
});

test("venue result above Ticketmaster deep-pagination ceiling is subdivided", () => {
  const job={id:"x",minLat:40,maxLat:41,minLng:10,maxLng:11,depth:2};
  assert.equal(shouldSplitVenueResult(1000,job),false);
  assert.equal(shouldSplitVenueResult(1001,job),true);
  const circle=jobSearchCircle(job);
  assert.ok(circle && circle.radius < HOTSPOT_MAX_RADIUS_KM);
});
