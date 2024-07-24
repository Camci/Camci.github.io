function ready(fn) {
    if (document.readyState !== 'loading'){
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  function addDemo(row) {
    if (!row.Issued && !row.Due) {
      for (const key of ['Number', 'Issued', 'Due']) {
        if (!row[key]) { row[key] = key; }
      }
      for (const key of ['Subtotal', 'Deduction', 'Taxes', 'Total']) {
        if (!(key in row)) { row[key] = key; }
      }
      if (!('Note' in row)) { row.Note = '(Anything in a Note column goes here)'; }
    }
    if (!row.Invoicer) {
      row.Invoicer = {
        Name: 'Invoicer.Name',
        Street1: 'Invoicer.Street1',
        Street2: 'Invoicer.Street2',
        City: 'Invoicer.City',
        State: '.State',
        Zip: '.Zip',
        Email: 'Invoicer.Email',
        Phone: 'Invoicer.Phone',
        Website: 'Invoicer.Website'
      }
    }
    if (!row.Client) {
      row.Client = {
        Name: 'Client.Name',
        Street1: 'Client.Street1',
        Street2: 'Client.Street2',
        City: 'Client.City',
        State: '.State',
        Zip: '.Zip'
      }
    }
    if (!row.Items) {
      row.Items = [
        {
          Description: 'Items[0].Description',
          Quantity: '.Quantity',
          Total: '.Total',
          Price: '.Price',
        },
        {
          Description: 'Items[1].Description',
          Quantity: '.Quantity',
          Total: '.Total',
          Price: '.Price',
        },
      ];
    }
    return row;
  }
  
  const data = {
    count: 0,
    invoice: '',
    status: 'waiting',
    tableConnected: false,
    rowConnected: false,
    haveRows: false,
  };
  let app = undefined;
  
  Vue.filter('currency', formatNumberAsUSD)
  function formatNumberAsUSD(value) {
    if (typeof value !== "number") {
      return value || '—';      // falsy value would be shown as a dash.
    }
    value = Math.round(value * 100) / 100;    // Round to nearest cent.
    value = (value === -0 ? 0 : value);       // Avoid negative zero.
  
    const result = value.toLocaleString('en', {
      style: 'currency', currency: 'USD'
    })
    if (result.includes('NaN')) {
      return value;
    }
    return result;
  }
  
  Vue.filter('round', function (value) {
    return value.toFixed(2);
  });

  Vue.filter('fallback', function(value, str) {
    if (!value) {
      throw new Error("Please provide column " + str);
    }
    return value;
  });
  
  Vue.filter('asDate', function(value) {
    if (typeof(value) === 'number') {
      value = new Date(value * 1000);
    }
    const date = moment.utc(value)
    return date.isValid() ? date.format('MMMM DD, YYYY') : value;
  });
  
  function tweakUrl(url) {
    if (!url) { return url; }
    if (url.toLowerCase().startsWith('http')) {
      return url;
    }
    return 'https://' + url;
  };
  
  function handleError(err) {
    console.error(err);
    const target = app || data;
    target.invoice = '';
    target.status = String(err).replace(/^Error: /, '');
    console.log(data);
  }
  
  function prepareList(lst, order) {
    if (order) {
      let orderedLst = [];
      const remaining = new Set(lst);
      for (const key of order) {
        if (remaining.has(key)) {
          remaining.delete(key);
          orderedLst.push(key);
        }
      }
      lst = [...orderedLst].concat([...remaining].sort());
    } else {
      lst = [...lst].sort();
    }
    return lst;
  }
  
  async function updateInvoice(row) {
    try {
      data.status = '';
      if (row === null) {
        throw new Error("(No data - not on row - please add or select a row)");
      }
      console.log("GOT...", JSON.stringify(row));
      if (row.References) {
        try {
          Object.assign(row, row.References);
        } catch (err) {
          throw new Error('Could not understand References column. ' + err);
        }
      }
  
      // Add some guidance about columns.
      const want = new Set(['Img', 'PCS', 'KARAT', 'Description', 'Options', 'Type','Weight (GR)', 'Labor/GR', 'Labor', 'Gold', 'Total']);
      const accepted = new Set(['References']);
      const importance = ['Img', 'PCS', 'KARAT', 'Description', 'Options', 'Type','Weight (GR)', 'Labor/GR', 'Labor', 'Gold', 'Total'];
  
      if (!(row.Due || row.Issued)) {
        const seen = new Set(Object.keys(row).filter(k => k !== 'id' && k !== '_error_'));
        const help = row.Help = {};
        help.seen = prepareList(seen);
        const missing = [...want].filter(k => !seen.has(k));
        const ignoring = [...seen].filter(k => !want.has(k) && !accepted.has(k));
        const recognized = [...seen].filter(k => want.has(k) || accepted.has(k));
        if (missing.length > 0) {
          help.expected = prepareList(missing, importance);
        }
        if (ignoring.length > 0) {
          help.ignored = prepareList(ignoring);
        }
        if (recognized.length > 0) {
          help.recognized = prepareList(recognized);
        }
        if (!seen.has('References') && !(row.Issued || row.Due)) {
          row.SuggestReferencesColumn = true;
        }
      }
      addDemo(row);
      if (!row.Subtotal && !row.Total && row.Items && Array.isArray(row.Items)) {
        try {
          row.Subtotal = row.Items.reduce((a, b) => a + b.Price * b.Quantity, 0);
          row.Total = row.Subtotal + (row.Taxes || 0) - (row.Deduction || 0);
        } catch (e) {
          console.error(e);
        }
      }
      if (row.Invoicer && row.Invoicer.Website && !row.Invoicer.Url) {
        row.Invoicer.Url = tweakUrl(row.Invoicer.Website);
      }
  
      if (row.Items && Array.isArray(row.Items)) {
        const tokenInfo = await grist.docApi.getAccessToken({ readOnly: true });
        const imageLoadStatus = {};
  
        row.Items.forEach((item, index) => {
          if (item.Img) {
            const id = item.Img;
            const src = `${tokenInfo.baseUrl}/attachments/${id}/download?auth=${tokenInfo.token}`;
            const img = document.querySelector(`.img-${index}`);
  
            if (img) {
              img.setAttribute('src', src);
  
              // Track image load status
              imageLoadStatus[index] = false;
  
              img.onload = () => {
                imageLoadStatus[index] = true;
                console.log(`Image ${index} loaded successfully.`);
              };
  
              img.onerror = () => {
                img.setAttribute('src', '/path/to/placeholder.jpg'); // Provide a path to a placeholder image
                imageLoadStatus[index] = false;
                console.log(`Failed to load image ${index}, set placeholder.`);
              };
            }
          }
        });
  
        // Check image load status and retry if necessary
        setTimeout(() => {
          retryLoadingImages(row.Items, imageLoadStatus, tokenInfo);
        }, 2000); // Retry after 3 seconds
      }
      // Fiddle around with updating Vue (I'm not an expert).
      for (const key of want) {
        Vue.delete(data.invoice, key);
      }
      for (const key of ['Help', 'SuggestReferencesColumn', 'References']) {
        Vue.delete(data.invoice, key);
      }
      data.invoice = Object.assign({}, data.invoice, row);
  
      // Make invoice information available for debugging.
      window.invoice = row;
    } catch (err) {
      handleError(err);
    }
  }
  
  function retryLoadingImages(items, imageLoadStatus, tokenInfo) {
    items.forEach((item, index) => {
      if (!imageLoadStatus[index] && item.Img) {
        const id = item.Img;
        const src = `${tokenInfo.baseUrl}/attachments/${id}/download?auth=${tokenInfo.token}`;
        const img = document.querySelector(`.img-${index}`);

        if (img) {
          img.setAttribute('src', src);

          img.onload = () => {
            imageLoadStatus[index] = true;
            console.log(`Image ${index} loaded successfully on retry.`);
          };

          img.onerror = () => {
            img.setAttribute('src', '/path/to/placeholder.jpg'); // Provide a path to a placeholder image
            imageLoadStatus[index] = false;
            console.log(`Failed to load image ${index} on retry, set placeholder.`);
          };
        }
      }
    });
  } 

  ready(function() {
    // Update the invoice anytime the document data changes.
    grist.ready();
    grist.onRecord(updateInvoice);
  
    // Monitor status so we can give user advice.
    grist.on('message', msg => {
      // If we are told about a table but not which row to access, check the
      // number of rows.  Currently if the table is empty, and "select by" is
      // not set, onRecord() will never be called.
      if (msg.tableId && !app.rowConnected) {
        grist.docApi.fetchSelectedTable().then(table => {
          if (table.id && table.id.length >= 1) {
            app.haveRows = true;
          }
        }).catch(e => console.log(e));
      }
      if (msg.tableId) { app.tableConnected = true; }
      if (msg.tableId && !msg.dataChange) { app.RowConnected = true; }
    });
  
    Vue.config.errorHandler = function (err, vm, info)  {
      handleError(err);
    };
  
    app = new Vue({
      el: '#app',
      data: data,
      computed: {
        groupedItems() {
          const groups = {};
          const desiredOrder = ['10K', '14K', '18K', '21K', '22K'];
          if (Array.isArray(this.invoice.Items)) {
            this.invoice.Items.forEach(item => {
              const karat = item.Karat + 'K';
              if (!groups[karat]) {
                groups[karat] = {
                  totalWeight: 0,
                  totalGoldPrice: 0,
                  totalLabor: 0,
                  goldPerGram: 0,
                  totalPrice: 0
                };
              }
              groups[karat].totalWeight += item.Weight;
              groups[karat].totalGoldPrice += item.Gold;
              groups[karat].totalLabor += item.Labor;
              groups[karat].totalPrice += item.Gold + item.Labor;
              groups[karat].goldPerGram = groups[karat].totalGoldPrice / groups[karat].totalWeight;
            });
          }
          // Ensure the groups are returned in the desired order
          const orderedGroups = {};
          desiredOrder.forEach(karat => {
            if (groups[karat]) {
              orderedGroups[karat] = groups[karat];
            }
          });
          return orderedGroups;
        },
        grandTotalWeight() {
          return this.invoice.Items.reduce((total, item) => total + item.Weight, 0);
        },
        grandTotalGoldPrice() {
          return this.invoice.Items.reduce((total, item) => total + item.Gold, 0);
        },
        grandTotalLabor() {
          return this.invoice.Items.reduce((total, item) => total + item.Labor, 0);
        },
        grandTotalPrice() {
          return this.invoice.Items.reduce((total, item) => total + item.Total, 0);
        },
        formattedTotal() {
          const total = this.invoice.Fix_Gold_Oz + this.invoice.Premium;
          return this.total;
        }
      }
    });
  
    if (document.location.search.includes('demo')) {
      updateInvoice(exampleData);
    }
    if (document.location.search.includes('labels')) {
      updateInvoice({});
    }
  });